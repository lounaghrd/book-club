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

// A member marking that they've already read a book (distinct from Book.read,
// which means the whole club has finished it). One per (book, user).
export type ReadBefore = {
  id: string;
  bookId: string;
  userId: string;
};

// A round of picking the next book: proposing (everyone adds one book, hidden
// from each other) → voting (full list revealed, upvote as many as you like) →
// closed (results shown, winner waiting to be started) → done (winner is the
// current reading).
export type SessionStatus = "proposing" | "voting" | "closed" | "done";

export type VotingSession = {
  id: string;
  status: SessionStatus;
  openedAt: number;
  closedAt: number | null;
  winnerBookId: string | null;
};

// One member's pick for a session. One per (session, user).
export type Nomination = {
  id: string;
  sessionId: string;
  bookId: string;
  userId: string;
  createdAt: number;
};

// An upvote on a nomination. One per (nomination, user); as many per session as
// the member likes.
export type NominationVote = {
  id: string;
  sessionId: string;
  nominationId: string;
  userId: string;
};
