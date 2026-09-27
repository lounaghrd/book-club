import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import type {
  Book,
  CurrentReading,
  Nomination,
  NominationVote,
  ReadBefore,
  User,
  VotingSession,
} from "@/lib/types";
import { CLUB_ID } from "@/lib/config";

// @supabase/ssr bundles its own SupabaseClient — derive DB from its factory so both
// browser and server clients (which use the same factory family) line up.
type DB = ReturnType<typeof createBrowserClient<Database>>;
type BookRow = Database["public"]["Tables"]["books"]["Row"];
type CurrentRow = Database["public"]["Tables"]["current_reading"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type ReadBeforeRow = Database["public"]["Tables"]["read_before"]["Row"];
type SessionRow = Database["public"]["Tables"]["voting_sessions"]["Row"];
type NominationRow = Database["public"]["Tables"]["nominations"]["Row"];
type NominationVoteRow = Database["public"]["Tables"]["nomination_votes"]["Row"];

export function mapBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    suggestedByUserId: row.suggested_by_user_id,
    suggestedByName: row.suggested_by_name,
    note: row.note,
    read: row.read,
    addedAt: new Date(row.added_at).getTime(),
  };
}

export function mapCurrent(row: CurrentRow): CurrentReading {
  return { bookId: row.book_id, meetingDate: row.meeting_date };
}

export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function mapSession(row: SessionRow): VotingSession {
  return {
    id: row.id,
    status: row.status,
    openedAt: new Date(row.opened_at).getTime(),
    closedAt: row.closed_at ? new Date(row.closed_at).getTime() : null,
    winnerBookId: row.winner_book_id,
  };
}

export function mapNomination(row: NominationRow): Nomination {
  return {
    id: row.id,
    sessionId: row.session_id,
    bookId: row.book_id,
    userId: row.user_id,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function mapNominationVote(row: NominationVoteRow): NominationVote {
  return {
    id: row.id,
    sessionId: row.session_id,
    nominationId: row.nomination_id,
    userId: row.user_id,
  };
}

export function mapReadBefore(row: ReadBeforeRow): ReadBefore {
  return { id: row.id, bookId: row.book_id, userId: row.user_id };
}

export async function fetchBooks(db: DB): Promise<Book[]> {
  const { data, error } = await db
    .from("books")
    .select("*")
    .eq("club_id", CLUB_ID)
    .order("added_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapBook);
}

export async function fetchCurrent(db: DB): Promise<CurrentReading | null> {
  const { data, error } = await db
    .from("current_reading")
    .select("*")
    .eq("club_id", CLUB_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCurrent(data) : null;
}

export async function fetchUsers(db: DB): Promise<User[]> {
  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("club_id", CLUB_ID)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapUser);
}

// The club's active (open or closed-awaiting-start) session, if any. Done sessions
// are history and aren't loaded; the DB allows at most one active per club.
export async function fetchActiveSession(db: DB): Promise<VotingSession | null> {
  const { data, error } = await db
    .from("voting_sessions")
    .select("*")
    .eq("club_id", CLUB_ID)
    .neq("status", "done")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSession(data) : null;
}

export async function insertSession(db: DB, session: VotingSession): Promise<void> {
  const { error } = await db.from("voting_sessions").insert({
    id: session.id,
    club_id: CLUB_ID,
    status: session.status,
    opened_at: new Date(session.openedAt).toISOString(),
  });
  if (error) throw error;
}

export async function updateSession(
  db: DB,
  id: string,
  fields: Pick<VotingSession, "status" | "closedAt" | "winnerBookId">,
): Promise<void> {
  const { error } = await db
    .from("voting_sessions")
    .update({
      status: fields.status,
      closed_at: fields.closedAt ? new Date(fields.closedAt).toISOString() : null,
      winner_book_id: fields.winnerBookId,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSession(db: DB, id: string): Promise<void> {
  const { error } = await db.from("voting_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchNominations(db: DB, sessionId: string): Promise<Nomination[]> {
  const { data, error } = await db
    .from("nominations")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapNomination);
}

export async function insertNomination(db: DB, nomination: Nomination): Promise<void> {
  const { error } = await db.from("nominations").insert({
    id: nomination.id,
    club_id: CLUB_ID,
    session_id: nomination.sessionId,
    book_id: nomination.bookId,
    user_id: nomination.userId,
    created_at: new Date(nomination.createdAt).toISOString(),
  });
  if (error) throw error;
}

export async function deleteNomination(db: DB, id: string): Promise<void> {
  const { error } = await db.from("nominations").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchNominationVotes(db: DB, sessionId: string): Promise<NominationVote[]> {
  const { data, error } = await db.from("nomination_votes").select("*").eq("session_id", sessionId);
  if (error) throw error;
  return (data ?? []).map(mapNominationVote);
}

export async function insertNominationVote(db: DB, vote: NominationVote): Promise<void> {
  const { error } = await db.from("nomination_votes").insert({
    id: vote.id,
    club_id: CLUB_ID,
    session_id: vote.sessionId,
    nomination_id: vote.nominationId,
    user_id: vote.userId,
  });
  if (error) throw error;
}

export async function deleteNominationVote(
  db: DB,
  nominationId: string,
  userId: string,
): Promise<void> {
  const { error } = await db
    .from("nomination_votes")
    .delete()
    .eq("nomination_id", nominationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function fetchReadBefore(db: DB): Promise<ReadBefore[]> {
  const { data, error } = await db.from("read_before").select("*").eq("club_id", CLUB_ID);
  if (error) throw error;
  return (data ?? []).map(mapReadBefore);
}

export async function insertReadBefore(db: DB, mark: ReadBefore): Promise<void> {
  const { error } = await db.from("read_before").insert({
    id: mark.id,
    club_id: CLUB_ID,
    book_id: mark.bookId,
    user_id: mark.userId,
  });
  if (error) throw error;
}

export async function deleteReadBefore(db: DB, bookId: string, userId: string): Promise<void> {
  const { error } = await db
    .from("read_before")
    .delete()
    .eq("book_id", bookId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function insertBook(db: DB, book: Book): Promise<void> {
  const { error } = await db.from("books").insert({
    id: book.id,
    club_id: CLUB_ID,
    title: book.title,
    author: book.author,
    suggested_by_user_id: book.suggestedByUserId,
    suggested_by_name: book.suggestedByName,
    note: book.note,
    read: book.read,
    added_at: new Date(book.addedAt).toISOString(),
  });
  if (error) throw error;
}

export async function updateBookRead(db: DB, id: string, read: boolean): Promise<void> {
  const { error } = await db.from("books").update({ read }).eq("id", id);
  if (error) throw error;
}

export async function updateBook(
  db: DB,
  id: string,
  fields: { title: string; author: string | null; note: string | null },
): Promise<void> {
  const { error } = await db.from("books").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteBook(db: DB, id: string): Promise<void> {
  const { error } = await db.from("books").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertCurrent(db: DB, current: CurrentReading): Promise<void> {
  const { error } = await db.from("current_reading").upsert({
    club_id: CLUB_ID,
    book_id: current.bookId,
    meeting_date: current.meetingDate,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function clearCurrent(db: DB): Promise<void> {
  const { error } = await db.from("current_reading").delete().eq("club_id", CLUB_ID);
  if (error) throw error;
}

export async function insertUser(db: DB, user: User): Promise<void> {
  const { error } = await db.from("users").insert({
    id: user.id,
    club_id: CLUB_ID,
    name: user.name,
    created_at: new Date(user.createdAt).toISOString(),
  });
  if (error) throw error;
}

export async function deleteUser(db: DB, id: string): Promise<void> {
  const { error } = await db.from("users").delete().eq("id", id);
  if (error) throw error;
}

export async function renameUser(db: DB, id: string, name: string): Promise<void> {
  const { error } = await db.from("users").update({ name }).eq("id", id);
  if (error) throw error;
  // Keep the denormalized snapshot on existing suggestions in sync.
  const { error: bookErr } = await db
    .from("books")
    .update({ suggested_by_name: name })
    .eq("suggested_by_user_id", id);
  if (bookErr) throw bookErr;
}
