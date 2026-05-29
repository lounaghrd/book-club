export type Book = {
  id: string;
  title: string;
  author: string | null;
  suggestedByUserId: string | null;
  suggestedByName: string | null;
  note: string | null;
  read: boolean;
  addedAt: number;
};

export type CurrentReading = {
  bookId: string;
  meetingDate: string | null; // YYYY-MM-DD
};

export type User = {
  id: string;
  name: string;
  createdAt: number;
};

export type Vote = {
  id: string;
  bookId: string;
  userId: string;
};

// A member marking that they've already read a book (distinct from Book.read,
// which means the whole club has finished it). One per (book, user).
export type ReadBefore = {
  id: string;
  bookId: string;
  userId: string;
};

export type Filter = "available" | "read";
