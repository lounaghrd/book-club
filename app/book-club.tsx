"use client";

import { useEffect, useMemo, useState } from "react";
import AddModal from "./add-modal";
import BookCard from "./book-card";
import BookList from "./book-list";
import Hero from "./hero";
import InstallPrompt from "./install-prompt";
import PinModal, { type PinTarget } from "./pin-modal";
import UserPicker from "./user-picker";
import { PlusIcon } from "./icons";
import type { Book, CurrentReading, Filter, User } from "@/lib/types";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { CLUB_ID } from "@/lib/config";

type BookRow = Database["public"]["Tables"]["books"]["Row"];
type CurrentRow = Database["public"]["Tables"]["current_reading"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
import {
  clearCurrent,
  deleteBook,
  deleteUser,
  insertBook,
  insertUser,
  mapBook,
  mapCurrent,
  mapUser,
  renameUser,
  updateBook,
  updateBookRead,
  upsertCurrent,
} from "@/lib/api";

const CURRENT_USER_KEY = "bookclub:current_user_id";

type Props = {
  initialBooks: Book[];
  initialCurrent: CurrentReading | null;
  initialUsers: User[];
};

export default function BookClub({ initialBooks, initialCurrent, initialUsers }: Props) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [current, setCurrent] = useState<CurrentReading | null>(initialCurrent);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [filter, setFilter] = useState<Filter>("available");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Book | null>(null);
  const [pinTarget, setPinTarget] = useState<PinTarget | null>(null);
  const [cardBookId, setCardBookId] = useState<string | null>(null);
  // undefined = haven't read localStorage yet (avoids flashing the picker on hydration)
  const [currentUserId, setCurrentUserId] = useState<string | null | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const currentBook = current ? books.find((b) => b.id === current.bookId) ?? null : null;
  const listBooks = books.filter((b) => b.id !== current?.bookId);
  const currentUser = currentUserId ? users.find((u) => u.id === currentUserId) ?? null : null;
  // Derive the open card's book from live state so realtime edits flow through and a
  // deleted book closes the card automatically.
  const cardBook = cardBookId ? books.find((b) => b.id === cardBookId) ?? null : null;
  const cardIsPinned = !!cardBook && cardBook.id === current?.bookId;

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
    setUsers((us) => us.filter((u) => u.id !== userId));
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
    }
  }

  async function addBook(data: { title: string; author: string; note: string }) {
    if (!currentUserId) {
      setPickerOpen(true);
      return;
    }
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
    setBooks((prev) => [book, ...prev]);
    setAddOpen(false);
    try {
      await insertBook(supabase, book);
    } catch (e) {
      console.error("Failed to add book", e);
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
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
    const prev = current;
    const next: CurrentReading =
      pinTarget.mode === "reschedule"
        ? { bookId: current!.bookId, meetingDate: date }
        : { bookId: pinTarget.bookId, meetingDate: date };
    setCurrent(next);
    setPinTarget(null);
    try {
      await upsertCurrent(supabase, next);
    } catch (e) {
      console.error("Failed to update current reading", e);
      setCurrent(prev);
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

  async function toggleRead(id: string) {
    const book = books.find((b) => b.id === id);
    if (!book) return;
    const next = !book.read;
    setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, read: next } : b)));
    try {
      await updateBookRead(supabase, id, next);
    } catch (e) {
      console.error("Failed to toggle read", e);
      setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, read: !next } : b)));
    }
  }

  async function removeBook(id: string) {
    if (!confirm("Remove this book from the list?")) return;
    const prevBooks = books;
    const prevCurrent = current;
    setBooks((bs) => bs.filter((b) => b.id !== id));
    if (current?.bookId === id) setCurrent(null);
    try {
      await deleteBook(supabase, id);
    } catch (e) {
      console.error("Failed to remove book", e);
      setBooks(prevBooks);
      setCurrent(prevCurrent);
    }
  }

  // Card actions: close the card first so sheets never stack, then run the existing
  // handler (Edit/Pin/Change-date open their own modal; the rest act in place).
  function runCardAction(action: () => void) {
    setCardBookId(null);
    action();
  }

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

        <BookList
          books={listBooks}
          filter={filter}
          onFilter={setFilter}
          onOpen={setCardBookId}
        />
      </div>

      <button className="fab" onClick={() => setAddOpen(true)}>
        <PlusIcon />
        Suggest a book
      </button>

      <BookCard
        book={cardBook}
        isPinned={cardIsPinned}
        onClose={() => setCardBookId(null)}
        onPin={() => cardBook && runCardAction(() => openPin(cardBook.id))}
        onReschedule={() => runCardAction(openReschedule)}
        onEdit={() => cardBook && runCardAction(() => openEdit(cardBook.id))}
        onFinish={() => runCardAction(finishCurrent)}
        onToggleRead={() => cardBook && runCardAction(() => toggleRead(cardBook.id))}
        onUnpin={() => runCardAction(unpin)}
        onRemove={() => cardBook && runCardAction(() => removeBook(cardBook.id))}
      />

      <AddModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={addBook} />
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
