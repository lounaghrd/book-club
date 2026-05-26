export type Book = {
  id: string;
  title: string;
  author: string | null;
  suggestedBy: string | null;
  read: boolean;
  addedAt: number;
};

export type CurrentReading = {
  bookId: string;
  meetingDate: string | null; // YYYY-MM-DD
};

export type Filter = "available" | "read";
