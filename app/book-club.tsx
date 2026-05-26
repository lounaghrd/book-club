"use client";

import { useEffect, useState } from "react";
import AddModal from "./add-modal";
import BookList from "./book-list";
import Hero from "./hero";
import PinModal, { type PinTarget } from "./pin-modal";
import { PlusIcon } from "./icons";
import type { Book, CurrentReading, Filter } from "@/lib/types";
import { uid } from "@/lib/uid";

function seed(): { books: Book[]; current: CurrentReading } {
  const meeting = new Date();
  meeting.setDate(meeting.getDate() + 18);
  const books: Book[] = [
    {
      id: uid(),
      title: "The Master and Margarita",
      author: "Mikhail Bulgakov",
      suggestedBy: "Louna",
      read: false,
      addedAt: Date.now() - 5000,
    },
    {
      id: uid(),
      title: "Tomorrow, and Tomorrow, and Tomorrow",
      author: "Gabrielle Zevin",
      suggestedBy: "Marc",
      read: false,
      addedAt: Date.now() - 4000,
    },
    {
      id: uid(),
      title: "Klara and the Sun",
      author: "Kazuo Ishiguro",
      suggestedBy: "Sofia",
      read: false,
      addedAt: Date.now() - 3000,
    },
    {
      id: uid(),
      title: "The Wind-Up Bird Chronicle",
      author: "Haruki Murakami",
      suggestedBy: "Diego",
      read: false,
      addedAt: Date.now() - 2000,
    },
    {
      id: uid(),
      title: "Pachinko",
      author: "Min Jin Lee",
      suggestedBy: "Elena",
      read: true,
      addedAt: Date.now() - 10000,
    },
  ];
  return {
    books,
    current: { bookId: books[0].id, meetingDate: meeting.toISOString().slice(0, 10) },
  };
}

export default function BookClub() {
  const [books, setBooks] = useState<Book[]>([]);
  const [current, setCurrent] = useState<CurrentReading | null>(null);
  const [filter, setFilter] = useState<Filter>("available");
  const [addOpen, setAddOpen] = useState(false);
  const [pinTarget, setPinTarget] = useState<PinTarget | null>(null);
  const [mounted, setMounted] = useState(false);

  // Seed on first mount to keep dates client-only (avoids hydration mismatch).
  useEffect(() => {
    const s = seed();
    setBooks(s.books);
    setCurrent(s.current);
    setMounted(true);
  }, []);

  const currentBook = current ? books.find((b) => b.id === current.bookId) ?? null : null;
  const listBooks = books.filter((b) => b.id !== current?.bookId);

  function addBook(data: { title: string; author: string; suggestedBy: string }) {
    setBooks((prev) => [
      ...prev,
      {
        id: uid(),
        title: data.title,
        author: data.author || null,
        suggestedBy: data.suggestedBy || null,
        read: false,
        addedAt: Date.now(),
      },
    ]);
    setAddOpen(false);
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

  function confirmPin(date: string) {
    if (!pinTarget) return;
    if (pinTarget.mode === "reschedule") {
      setCurrent((c) => (c ? { ...c, meetingDate: date } : c));
    } else {
      setCurrent({ bookId: pinTarget.bookId, meetingDate: date });
    }
    setPinTarget(null);
  }

  function finishCurrent() {
    if (!current) return;
    setBooks((prev) => prev.map((b) => (b.id === current.bookId ? { ...b, read: true } : b)));
    setCurrent(null);
  }

  function unpin() {
    setCurrent(null);
  }

  function toggleRead(id: string) {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, read: !b.read } : b)));
  }

  function removeBook(id: string) {
    if (!confirm("Remove this book from the list?")) return;
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setCurrent((c) => (c?.bookId === id ? null : c));
  }

  // Don't render until seed is set — keeps initial server HTML and first client paint identical (an empty container).
  if (!mounted) {
    return (
      <div className="container">
        <header>
          <div className="logo">
            <span className="dot" />
            Book Club
          </div>
        </header>
      </div>
    );
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
    </>
  );
}
