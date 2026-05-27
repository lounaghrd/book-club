export type Book = {
  id: string;
  title: string;
  author: string | null;
  suggestedByUserId: string | null;
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

export type Filter = "available" | "read";
