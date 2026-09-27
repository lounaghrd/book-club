"use client";

import { useEffect, useMemo, useState } from "react";
import AddModal from "./add-modal";
import BookCard, { type CardContext, type CardVote } from "./book-card";
import BookList from "./book-list";
import Hero from "./hero";
import InstallPrompt from "./install-prompt";
import PinModal, { type PinTarget } from "./pin-modal";
import UserPicker from "./user-picker";
import ConfirmDialog from "./confirm-dialog";
import Voting, { type Entry } from "./voting";
import type {
  Book,
  CurrentReading,
  Nomination,
  NominationVote,
  ReadBefore,
  User,
  VotingSession,
} from "@/lib/types";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { CLUB_ID } from "@/lib/config";

type BookRow = Database["public"]["Tables"]["books"]["Row"];
type CurrentRow = Database["public"]["Tables"]["current_reading"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type ReadBeforeRow = Database["public"]["Tables"]["read_before"]["Row"];
type SessionRow = Database["public"]["Tables"]["voting_sessions"]["Row"];
type NominationRow = Database["public"]["Tables"]["nominations"]["Row"];
type NominationVoteRow = Database["public"]["Tables"]["nomination_votes"]["Row"];
import {
  clearCurrent,
  deleteBook,
  deleteNominationVote,
  deleteReadBefore,
  deleteSession,
  deleteUser,
  fetchActiveSession,
  fetchNominationVotes,
  fetchNominations,
  insertBook,
  insertNomination,
  insertNominationVote,
  insertReadBefore,
  insertSession,
  insertUser,
  mapBook,
  mapCurrent,
  mapNomination,
  mapNominationVote,
  mapReadBefore,
  mapSession,
  mapUser,
  renameUser,
  updateBook,
  updateBookRead,
  updateSession,
  upsertCurrent,
} from "@/lib/api";
import { daysUntil } from "@/lib/format";

const CURRENT_USER_KEY = "bookclub:current_user_id";

type Props = {
  initialBooks: Book[];
  initialCurrent: CurrentReading | null;
  initialUsers: User[];
  initialReadBefore: ReadBefore[];
  initialSession: VotingSession | null;
  initialNominations: Nomination[];
  initialNominationVotes: NominationVote[];
};

// Suggest opening a vote once the meeting is this close (or already past).
const NUDGE_DAYS = 7;

export default function BookClub({
  initialBooks,
  initialCurrent,
  initialUsers,
  initialReadBefore,
  initialSession,
  initialNominations,
  initialNominationVotes,
}: Props) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [current, setCurrent] = useState<CurrentReading | null>(initialCurrent);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [readBefore, setReadBefore] = useState<ReadBefore[]>(initialReadBefore);
  const [session, setSession] = useState<VotingSession | null>(initialSession);
  const [nominations, setNominations] = useState<Nomination[]>(initialNominations);
  const [nomVotes, setNomVotes] = useState<NominationVote[]>(initialNominationVotes);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Book | null>(null);
  const [pinTarget, setPinTarget] = useState<PinTarget | null>(null);
  const [cardBookId, setCardBookId] = useState<string | null>(null);
  // undefined = haven't read localStorage yet (avoids flashing the picker on hydration)
  const [currentUserId, setCurrentUserId] = useState<string | null | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  // The nudge depends on today's date; only compute it after mount so server and
  // client render the same markup.
  const [mounted, setMounted] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(CURRENT_USER_KEY);
    } catch {
      // localStorage unavailable — treat as no current user.
    }
    // Drop stale ids (user was deleted on another device).
    if (stored && !initialUsers.some((u) => u.id === stored)) stored = null;
    setCurrentUserId(stored);
    if (!stored) setPickerOpen(true);
    setMounted(true);
  }, [initialUsers]);

  useEffect(() => {
    const clubFilter = `club_id=eq.${CLUB_ID}`;
    const channel = supabase
      .channel(`club:${CLUB_ID}`)
      .on<BookRow>(
        "postgres_changes",
        { event: "*", schema: "public", table: "books", filter: clubFilter },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const incoming = mapBook(payload.new);
            setBooks((prev) =>
              prev.some((b) => b.id === incoming.id) ? prev : [incoming, ...prev],
            );
          } else if (payload.eventType === "UPDATE") {
            const incoming = mapBook(payload.new);
            setBooks((prev) => prev.map((b) => (b.id === incoming.id ? incoming : b)));
          } else if (payload.eventType === "DELETE") {
            const id = payload.old.id;
            if (!id) return;
            setBooks((prev) => prev.filter((b) => b.id !== id));
            setCurrent((cur) => (cur?.bookId === id ? null : cur));
          }
        },
      )
      .on<CurrentRow>(
        "postgres_changes",
        { event: "*", schema: "public", table: "current_reading", filter: clubFilter },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setCurrent(null);
          } else {
            setCurrent(mapCurrent(payload.new));
          }
        },
      )
      .on<UserRow>(
        "postgres_changes",
        { event: "*", schema: "public", table: "users", filter: clubFilter },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const incoming = mapUser(payload.new);
            setUsers((prev) =>
              prev.some((u) => u.id === incoming.id)
                ? prev
                : [...prev, incoming].sort((a, b) => a.createdAt - b.createdAt),
            );
          } else if (payload.eventType === "UPDATE") {
            const incoming = mapUser(payload.new);
            setUsers((prev) => prev.map((u) => (u.id === incoming.id ? incoming : u)));
          } else if (payload.eventType === "DELETE") {
            const id = payload.old.id;
            if (!id) return;
            setUsers((prev) => prev.filter((u) => u.id !== id));
            setCurrentUserId((cur) => {
              if (cur !== id) return cur;
              try {
                localStorage.removeItem(CURRENT_USER_KEY);
              } catch {
                // ignore
              }
              setPickerOpen(true);
              return null;
            });
          }
        },
      )
      .on<SessionRow>(
        "postgres_changes",
        { event: "*", schema: "public", table: "voting_sessions", filter: clubFilter },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = payload.old.id;
            if (!id) return;
            setSession((cur) => (cur?.id === id ? null : cur));
            return;
          }
          // Only the active session is kept; a session going "done" drops out.
          // The DB allows one active session per club, so an active incoming row
          // is authoritative.
          const incoming = mapSession(payload.new);
          setSession((cur) =>
            incoming.status === "done" ? (cur?.id === incoming.id ? null : cur) : incoming,
          );
        },
      )
      .on<NominationRow>(
        "postgres_changes",
        { event: "*", schema: "public", table: "nominations", filter: clubFilter },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const incoming = mapNomination(payload.new);
            setNominations((prev) =>
              prev.some((n) => n.id === incoming.id) ? prev : [...prev, incoming],
            );
          } else if (payload.eventType === "DELETE") {
            const id = payload.old.id;
            if (!id) return;
            setNominations((prev) => prev.filter((n) => n.id !== id));
          }
        },
      )
      .on<NominationVoteRow>(
        "postgres_changes",
        { event: "*", schema: "public", table: "nomination_votes", filter: clubFilter },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const incoming = mapNominationVote(payload.new);
            setNomVotes((prev) =>
              prev.some((v) => v.id === incoming.id) ? prev : [...prev, incoming],
            );
          } else if (payload.eventType === "DELETE") {
            const id = payload.old.id;
            if (!id) return;
            setNomVotes((prev) => prev.filter((v) => v.id !== id));
          }
        },
      )
      .on<ReadBeforeRow>(
        "postgres_changes",
        { event: "*", schema: "public", table: "read_before", filter: clubFilter },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const incoming = mapReadBefore(payload.new);
            setReadBefore((prev) =>
              prev.some((r) => r.id === incoming.id) ? prev : [...prev, incoming],
            );
          } else if (payload.eventType === "DELETE") {
            const id = payload.old.id;
            if (!id) return;
            setReadBefore((prev) => prev.filter((r) => r.id !== id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const currentBook = current ? books.find((b) => b.id === current.bookId) ?? null : null;
  const currentUser = currentUserId ? users.find((u) => u.id === currentUserId) ?? null : null;

  // "Already read it" tallies, derived from the flat list so realtime echoes flow
  // straight through: a count per book and the set the current user has marked.
  const readBeforeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of readBefore) counts.set(r.bookId, (counts.get(r.bookId) ?? 0) + 1);
    return counts;
  }, [readBefore]);
  const myReadBefore = useMemo(() => {
    const mine = new Set<string>();
    if (currentUserId) {
      for (const r of readBefore) if (r.userId === currentUserId) mine.add(r.bookId);
    }
    return mine;
  }, [readBefore, currentUserId]);

  // The active session's nominations joined with their book, nominator and vote
  // tallies. Nominations/votes from other sessions (realtime can deliver them)
  // are filtered out here rather than at the subscription.
  const sessionVotes = useMemo(
    () => (session ? nomVotes.filter((v) => v.sessionId === session.id) : []),
    [nomVotes, session],
  );
  const entries = useMemo<Entry[]>(() => {
    if (!session) return [];
    const counts = new Map<string, number>();
    const mine = new Set<string>();
    for (const v of sessionVotes) {
      counts.set(v.nominationId, (counts.get(v.nominationId) ?? 0) + 1);
      if (v.userId === currentUserId) mine.add(v.nominationId);
    }
    const out: Entry[] = [];
    for (const n of nominations) {
      if (n.sessionId !== session.id) continue;
      const book = books.find((b) => b.id === n.bookId);
      if (!book) continue;
      out.push({
        nomination: n,
        book,
        votes: counts.get(n.id) ?? 0,
        voted: mine.has(n.id),
        readBefore: readBeforeCounts.get(book.id) ?? 0,
      });
    }
    return out.sort((a, b) => a.nomination.createdAt - b.nomination.createdAt);
  }, [session, sessionVotes, nominations, books, currentUserId, readBeforeCounts]);
  const voterCount = useMemo(
    () => new Set(sessionVotes.map((v) => v.userId)).size,
    [sessionVotes],
  );
  const myEntry = currentUserId
    ? entries.find((e) => e.nomination.userId === currentUserId) ?? null
    : null;

  // Colour the "Open suggestions" button when it's time to pick: nothing pinned,
  // or the meeting is within NUDGE_DAYS (or past).
  let nudge = false;
  if (mounted && !session) {
    const days = current?.meetingDate ? daysUntil(current.meetingDate) : null;
    nudge = !currentBook || (days !== null && days <= NUDGE_DAYS);
  }

  // Derive the open card's book from live state so realtime edits flow through and a
  // deleted book closes the card automatically.
  const cardBook = cardBookId ? books.find((b) => b.id === cardBookId) ?? null : null;
  const cardEntry = cardBook ? entries.find((e) => e.book.id === cardBook.id) ?? null : null;
  let cardContext: CardContext = "other";
  if (cardBook) {
    if (cardBook.id === current?.bookId) cardContext = "current";
    else if (cardEntry) cardContext = "nomination";
    else if (cardBook.read) cardContext = "read";
  }
  const cardVote = useMemo<CardVote | null>(() => {
    if (!cardEntry || !session || session.status === "proposing") return null;
    const voting = session.status === "voting";
    return { count: voting ? null : cardEntry.votes, voted: cardEntry.voted, canVote: voting };
  }, [cardEntry, session]);

  function selectUser(userId: string) {
    setCurrentUserId(userId);
    try {
      localStorage.setItem(CURRENT_USER_KEY, userId);
    } catch {
      // ignore
    }
    setPickerOpen(false);
  }

  async function addUser(name: string): Promise<User | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = users.find((u) => u.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    const user: User = { id: crypto.randomUUID(), name: trimmed, createdAt: Date.now() };
    setUsers((prev) => [...prev, user]);
    try {
      await insertUser(supabase, user);
      return user;
    } catch (e) {
      console.error("Failed to add user", e);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      return null;
    }
  }

  async function changeUserName(userId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const prevUsers = users;
    const prevBooks = books;
    setUsers((us) => us.map((u) => (u.id === userId ? { ...u, name: trimmed } : u)));
    setBooks((bs) =>
      bs.map((b) => (b.suggestedByUserId === userId ? { ...b, suggestedByName: trimmed } : b)),
    );
    try {
      await renameUser(supabase, userId, trimmed);
    } catch (e) {
      console.error("Failed to rename user", e);
      setUsers(prevUsers);
      setBooks(prevBooks);
    }
  }

  async function removeUser(userId: string) {
    const prev = users;
    const prevNoms = nominations;
    const prevNomVotes = nomVotes;
    setUsers((us) => us.filter((u) => u.id !== userId));
    // Their nominations and votes cascade-delete in the DB; mirror that locally.
    const theirNoms = new Set(nominations.filter((n) => n.userId === userId).map((n) => n.id));
    setNominations((ns) => ns.filter((n) => n.userId !== userId));
    setNomVotes((vs) => vs.filter((v) => v.userId !== userId && !theirNoms.has(v.nominationId)));
    if (currentUserId === userId) {
      setCurrentUserId(null);
      try {
        localStorage.removeItem(CURRENT_USER_KEY);
      } catch {
        // ignore
      }
    }
    try {
      await deleteUser(supabase, userId);
    } catch (e) {
      console.error("Failed to delete user", e);
      setUsers(prev);
      setNominations(prevNoms);
      setNomVotes(prevNomVotes);
    }
  }

  function openSuggest() {
    if (!currentUserId) {
      setPickerOpen(true);
      return;
    }
    setAddOpen(true);
  }

  // Add the member's one suggestion for this session. Changing it afterwards is
  // a plain book edit (openEdit), so there's never more than one per person.
  async function nominate(data: { title: string; author: string; note: string }) {
    if (!currentUserId) {
      setPickerOpen(true);
      return;
    }
    if (!session || session.status !== "proposing" || myEntry) return;
    const book: Book = {
      id: crypto.randomUUID(),
      title: data.title,
      author: data.author || null,
      suggestedByUserId: currentUserId,
      suggestedByName: currentUser?.name ?? null,
      note: data.note || null,
      read: false,
      addedAt: Date.now(),
    };
    const nomination: Nomination = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      bookId: book.id,
      userId: currentUserId,
      createdAt: Date.now(),
    };
    setBooks((bs) => [book, ...bs]);
    setNominations((ns) => [...ns, nomination]);
    setAddOpen(false);
    try {
      await insertBook(supabase, book);
      await insertNomination(supabase, nomination);
    } catch (e) {
      console.error("Failed to add suggestion", e);
      setBooks((bs) => bs.filter((b) => b.id !== book.id));
      setNominations((ns) => ns.filter((n) => n.id !== nomination.id));
    }
  }

  async function toggleNomVote(nominationId: string) {
    if (!currentUserId) {
      setPickerOpen(true);
      return;
    }
    if (!session || session.status !== "voting") return;
    const existing = sessionVotes.find(
      (v) => v.nominationId === nominationId && v.userId === currentUserId,
    );
    const prev = nomVotes;
    if (existing) {
      setNomVotes((vs) => vs.filter((v) => v.id !== existing.id));
      try {
        await deleteNominationVote(supabase, nominationId, currentUserId);
      } catch (e) {
        console.error("Failed to remove vote", e);
        setNomVotes(prev);
      }
    } else {
      const vote: NominationVote = {
        id: crypto.randomUUID(),
        sessionId: session.id,
        nominationId,
        userId: currentUserId,
      };
      setNomVotes((vs) => [...vs, vote]);
      try {
        await insertNominationVote(supabase, vote);
      } catch (e) {
        console.error("Failed to add vote", e);
        setNomVotes((vs) => vs.filter((v) => v.id !== vote.id));
      }
    }
  }

  // Resync the session from the DB after a failed session write — usually a
  // race where someone else opened/closed it first.
  async function resyncSession() {
    try {
      const fresh = await fetchActiveSession(supabase);
      setSession(fresh);
      if (fresh) {
        const [ns, vs] = await Promise.all([
          fetchNominations(supabase, fresh.id),
          fetchNominationVotes(supabase, fresh.id),
        ]);
        setNominations(ns);
        setNomVotes(vs);
      }
    } catch (e) {
      console.error("Failed to resync voting session", e);
    }
  }

  async function openSuggestions() {
    if (session) return;
    const next: VotingSession = {
      id: crypto.randomUUID(),
      status: "proposing",
      openedAt: Date.now(),
      closedAt: null,
      winnerBookId: null,
    };
    setSession(next);
    try {
      await insertSession(supabase, next);
    } catch (e) {
      console.error("Failed to open suggestions", e);
      await resyncSession();
    }
  }

  // Move to the next stage: suggestions → voting → results. Closing suggestions
  // with nobody having suggested anything just cancels the session.
  async function advanceSession() {
    setCloseConfirmOpen(false);
    if (!session) return;
    const prev = session;
    if (prev.status === "proposing" && entries.length === 0) {
      setSession(null);
      try {
        await deleteSession(supabase, prev.id);
      } catch (e) {
        console.error("Failed to cancel session", e);
        await resyncSession();
      }
      return;
    }
    let next: VotingSession;
    if (prev.status === "proposing") next = { ...prev, status: "voting" };
    else if (prev.status === "voting") next = { ...prev, status: "closed", closedAt: Date.now() };
    else return;
    setSession(next);
    try {
      await updateSession(supabase, next.id, next);
    } catch (e) {
      console.error("Failed to advance session", e);
      await resyncSession();
    }
  }

  function openEdit(bookId: string) {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;
    setEditTarget(book);
  }

  async function editBook(data: { title: string; author: string; note: string }) {
    if (!editTarget) return;
    const id = editTarget.id;
    const next = { title: data.title, author: data.author || null, note: data.note || null };
    const prevBooks = books;
    setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, ...next } : b)));
    setEditTarget(null);
    try {
      await updateBook(supabase, id, next);
    } catch (e) {
      console.error("Failed to edit book", e);
      setBooks(prevBooks);
    }
  }

  function openPin(bookId: string) {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;
    setPinTarget({ mode: "pin", bookId, title: book.title, author: book.author });
  }

  function openReschedule() {
    if (!current || !currentBook) return;
    setPinTarget({
      mode: "reschedule",
      title: currentBook.title,
      currentDate: current.meetingDate,
    });
  }

  async function confirmPin(date: string) {
    if (!pinTarget) return;
    if (pinTarget.mode === "pin") {
      await startBook(pinTarget.bookId, date);
      return;
    }
    const prev = current;
    const next: CurrentReading = { bookId: current!.bookId, meetingDate: date };
    setCurrent(next);
    setPinTarget(null);
    try {
      await upsertCurrent(supabase, next);
    } catch (e) {
      console.error("Failed to update current reading", e);
      setCurrent(prev);
    }
  }

  // Start the vote's winner: it becomes the current reading, the book it replaces
  // moves to the Read history, and the session is marked done.
  async function startBook(bookId: string, date: string) {
    const prevCurrent = current;
    const prevBooks = books;
    const prevSession = session;
    const finishedId = current && current.bookId !== bookId ? current.bookId : null;
    const next: CurrentReading = { bookId, meetingDate: date };
    if (finishedId) setBooks((bs) => bs.map((b) => (b.id === finishedId ? { ...b, read: true } : b)));
    setCurrent(next);
    setSession(null);
    setPinTarget(null);
    try {
      if (finishedId) await updateBookRead(supabase, finishedId, true);
      await upsertCurrent(supabase, next);
      if (prevSession) {
        await updateSession(supabase, prevSession.id, {
          status: "done",
          closedAt: prevSession.closedAt ?? Date.now(),
          winnerBookId: bookId,
        });
      }
    } catch (e) {
      console.error("Failed to start the next book", e);
      setBooks(prevBooks);
      setCurrent(prevCurrent);
      setSession(prevSession);
    }
  }

  async function finishCurrent() {
    if (!current) return;
    const id = current.bookId;
    const prevCurrent = current;
    const prevBooks = books;
    setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, read: true } : b)));
    setCurrent(null);
    try {
      await clearCurrent(supabase);
      await updateBookRead(supabase, id, true);
    } catch (e) {
      console.error("Failed to finish current book", e);
      setBooks(prevBooks);
      setCurrent(prevCurrent);
    }
  }

  async function unpin() {
    const prev = current;
    setCurrent(null);
    try {
      await clearCurrent(supabase);
    } catch (e) {
      console.error("Failed to unpin", e);
      setCurrent(prev);
    }
  }

  async function toggleReadBefore(id: string) {
    if (!currentUserId) {
      setPickerOpen(true);
      return;
    }
    const existing = readBefore.find((r) => r.bookId === id && r.userId === currentUserId);
    const prev = readBefore;
    if (existing) {
      setReadBefore((rs) => rs.filter((r) => r.id !== existing.id));
      try {
        await deleteReadBefore(supabase, id, currentUserId);
      } catch (e) {
        console.error("Failed to remove read-before mark", e);
        setReadBefore(prev);
      }
    } else {
      const mark: ReadBefore = { id: crypto.randomUUID(), bookId: id, userId: currentUserId };
      setReadBefore((rs) => [...rs, mark]);
      try {
        await insertReadBefore(supabase, mark);
      } catch (e) {
        console.error("Failed to add read-before mark", e);
        setReadBefore((rs) => rs.filter((r) => r.id !== mark.id));
      }
    }
  }

  async function removeBook(id: string) {
    if (!confirm("Remove this book from the list?")) return;
    const prevBooks = books;
    const prevCurrent = current;
    const prevNoms = nominations;
    const prevNomVotes = nomVotes;
    const prevReadBefore = readBefore;
    setBooks((bs) => bs.filter((b) => b.id !== id));
    // Nominations (and their votes) and read-before marks cascade-delete in the
    // DB; drop them locally too so the counts don't linger.
    const bookNoms = new Set(nominations.filter((n) => n.bookId === id).map((n) => n.id));
    setNominations((ns) => ns.filter((n) => n.bookId !== id));
    setNomVotes((vs) => vs.filter((v) => !bookNoms.has(v.nominationId)));
    setReadBefore((rs) => rs.filter((r) => r.bookId !== id));
    if (current?.bookId === id) setCurrent(null);
    try {
      await deleteBook(supabase, id);
    } catch (e) {
      console.error("Failed to remove book", e);
      setBooks(prevBooks);
      setCurrent(prevCurrent);
      setNominations(prevNoms);
      setNomVotes(prevNomVotes);
      setReadBefore(prevReadBefore);
    }
  }

  // Card actions: close the card first so sheets never stack, then run the existing
  // handler (Edit/Pin/Change-date open their own modal; the rest act in place).
  function runCardAction(action: () => void) {
    setCardBookId(null);
    action();
  }

  const advanceCopy =
    session?.status === "voting"
      ? { title: "Close voting?", message: "Everyone will see the results.", confirm: "Close voting" }
      : entries.length === 0
        ? { title: "Cancel?", message: "Nobody has suggested a book yet.", confirm: "Cancel" }
        : {
            title: "Start voting?",
            message: "Suggestions will close and everyone can vote.",
            confirm: "Start voting",
          };

  // Only surface the install prompt once a user is selected, so two sheets don't stack.
  const showInstallPrompt = currentUserId !== undefined && currentUserId !== null && !pickerOpen;

  return (
    <>
      <div className="container">
        <header>
          <div className="logo">
            <span className="dot" />
            Book Club
          </div>
          {currentUser ? (
            <button
              className="user-chip"
              onClick={() => setPickerOpen(true)}
              aria-label="Change user"
            >
              <span className="user-chip-dot" />
              {currentUser.name}
            </button>
          ) : null}
        </header>

        <Hero
          current={current}
          book={currentBook}
          onOpen={() => currentBook && setCardBookId(currentBook.id)}
        />

        <Voting
          session={session}
          entries={entries}
          voterCount={voterCount}
          myEntry={myEntry}
          nudge={nudge}
          onOpen={openSuggestions}
          onSuggest={openSuggest}
          onEditMine={() => myEntry && openEdit(myEntry.book.id)}
          onOpenCard={setCardBookId}
          onVote={toggleNomVote}
          onAdvance={() => setCloseConfirmOpen(true)}
          onStart={openPin}
        />

        <BookList books={books} onOpen={setCardBookId} />
      </div>

      <BookCard
        book={cardBook}
        context={cardContext}
        vote={cardVote}
        onVote={() => cardEntry && toggleNomVote(cardEntry.nomination.id)}
        readBeforeCount={cardBook ? readBeforeCounts.get(cardBook.id) ?? 0 : 0}
        hasReadBefore={cardBook ? myReadBefore.has(cardBook.id) : false}
        onReadBefore={() => cardBook && toggleReadBefore(cardBook.id)}
        onClose={() => setCardBookId(null)}
        onReschedule={() => runCardAction(openReschedule)}
        onEdit={() => cardBook && runCardAction(() => openEdit(cardBook.id))}
        onFinish={() => runCardAction(finishCurrent)}
        onUnpin={() => runCardAction(unpin)}
        onRemove={() => cardBook && runCardAction(() => removeBook(cardBook.id))}
      />

      <AddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={nominate}
      />
      <AddModal
        open={!!editTarget}
        mode="edit"
        initialTitle={editTarget?.title ?? ""}
        initialAuthor={editTarget?.author ?? ""}
        initialNote={editTarget?.note ?? ""}
        onClose={() => setEditTarget(null)}
        onSubmit={editBook}
      />
      <PinModal target={pinTarget} onClose={() => setPinTarget(null)} onConfirm={confirmPin} />
      <ConfirmDialog
        open={closeConfirmOpen}
        title={advanceCopy.title}
        message={advanceCopy.message}
        confirmLabel={advanceCopy.confirm}
        cancelLabel="Not yet"
        onConfirm={advanceSession}
        onCancel={() => setCloseConfirmOpen(false)}
      />
      <UserPicker
        open={pickerOpen}
        users={users}
        currentUserId={currentUserId ?? null}
        dismissible={!!currentUserId}
        onClose={() => setPickerOpen(false)}
        onSelect={selectUser}
        onAdd={addUser}
        onRename={changeUserName}
        onDelete={removeUser}
      />
      {showInstallPrompt ? <InstallPrompt /> : null}
    </>
  );
}
