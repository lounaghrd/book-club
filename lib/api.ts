import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import type { Book, CurrentReading, User, Vote } from "@/lib/types";
import { CLUB_ID } from "@/lib/config";

// @supabase/ssr bundles its own SupabaseClient — derive DB from its factory so both
// browser and server clients (which use the same factory family) line up.
type DB = ReturnType<typeof createBrowserClient<Database>>;
type BookRow = Database["public"]["Tables"]["books"]["Row"];
type CurrentRow = Database["public"]["Tables"]["current_reading"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type VoteRow = Database["public"]["Tables"]["votes"]["Row"];

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

export function mapVote(row: VoteRow): Vote {
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

export async function fetchVotes(db: DB): Promise<Vote[]> {
  const { data, error } = await db.from("votes").select("*").eq("club_id", CLUB_ID);
  if (error) throw error;
  return (data ?? []).map(mapVote);
}

export async function insertVote(db: DB, vote: Vote): Promise<void> {
  const { error } = await db.from("votes").insert({
    id: vote.id,
    club_id: CLUB_ID,
    book_id: vote.bookId,
    user_id: vote.userId,
  });
  if (error) throw error;
}

export async function deleteVote(db: DB, bookId: string, userId: string): Promise<void> {
  const { error } = await db
    .from("votes")
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
