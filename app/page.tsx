import BookClub from "./book-club";
import { fetchBooks, fetchCurrent } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const [books, current] = await Promise.all([fetchBooks(supabase), fetchCurrent(supabase)]);
  return <BookClub initialBooks={books} initialCurrent={current} />;
}
