"use client";

import { useEffect, useMemo, useState } from "react";
import AddModal from "./add-modal";
import BookList from "./book-list";
import Hero from "./hero";
import InstallPrompt from "./install-prompt";
import PinModal, { type PinTarget } from "./pin-modal";
import { PlusIcon } from "./icons";
import type { Book, CurrentReading, Filter } from "@/lib/types";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { CLUB_ID } from "@/lib/config";

type BookRow = Database["public"]["Tables"]["books"]["Row"];
type CurrentRow = Database["public"]["Tables"]["current_reading"]["Row"];
import {
  clearCurrent,
  deleteBook,
  insertBook,
  mapBook,
  mapCurrent,
  updateBookRead,
  upsertCurrent,
} from "@/lib/api";

type Props = {
  initialBooks: Book[];
  initialCurrent: CurrentReading | null;
};

export default function BookClub({ initialBooks, initialCurrent }: Props) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [current, setCurrent] = useState<CurrentReading | null>(initialCurrent);
  const [filter, setFilter] = useState<Filter>("available");
  const [addOpen, setAddOpen] = useState(false);
  const [pinTarget, setPinTarget] = useState<PinTarget | null>(null);

  const supabase = useMemo(() => createClient(), []);

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const currentBook = current ? books.find((b) => b.id === current.bookId) ?? null : null;
  const listBooks = books.filter((b) => b.id !== current?.bookId);

  async function addBook(data: { title: string; author: string; suggestedBy: string }) {
    const book: Book = {
      id: crypto.randomUUID(),
      title: data.title,
      author: data.author || null,
      suggestedBy: data.suggestedBy || null,
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

  return (
    <>
      <div className="container">
        <header>
          <div className="logo">
            <span className="dot" />
            Book Club
          </div>
        </header>

        <Hero
          current={current}
          book={currentBook}
          onReschedule={openReschedule}
          onFinish={finishCurrent}
          onUnpin={unpin}
        />

        <BookList
          books={listBooks}
          filter={filter}
          onFilter={setFilter}
          onPin={openPin}
          onToggleRead={toggleRead}
          onRemove={removeBook}
        />
      </div>

      <button className="fab" onClick={() => setAddOpen(true)}>
        <PlusIcon />
        Suggest a book
      </button>

      <AddModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={addBook} />
      <PinModal target={pinTarget} onClose={() => setPinTarget(null)} onConfirm={confirmPin} />
      <InstallPrompt />
    </>
  );
}
