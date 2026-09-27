import BookClub from "./book-club";
import {
  fetchActiveSession,
  fetchBooks,
  fetchCurrent,
  fetchNominationVotes,
  fetchNominations,
  fetchReadBefore,
  fetchUsers,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const [books, current, users, readBefore, session] = await Promise.all([
    fetchBooks(supabase),
    fetchCurrent(supabase),
    fetchUsers(supabase),
    fetchReadBefore(supabase),
    fetchActiveSession(supabase),
  ]);
  const [nominations, nominationVotes] = session
    ? await Promise.all([
        fetchNominations(supabase, session.id),
        fetchNominationVotes(supabase, session.id),
      ])
    : [[], []];
  return (
    <BookClub
      initialBooks={books}
      initialCurrent={current}
      initialUsers={users}
      initialReadBefore={readBefore}
      initialSession={session}
      initialNominations={nominations}
      initialNominationVotes={nominationVotes}
    />
  );
}
