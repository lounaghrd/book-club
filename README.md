# Book Club

A mobile-first web app for a small private book club. See `SPEC.md` for the full spec and `book-club.html` for the visual prototype.

Stack: Next.js 15 (App Router) · Supabase (Postgres + Realtime) · Bricolage Grotesque · Vercel.

## Setup

1. **Install deps**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at https://supabase.com.

3. **Run the schema** in the Supabase SQL editor — copy/paste `supabase/migrations/0001_init.sql` then `supabase/migrations/0002_replica_identity_full.sql`. Together they create the `books` and `current_reading` tables, enable RLS with open-link policies, add both tables to the realtime publication, and set `REPLICA IDENTITY FULL` so realtime DELETE events carry enough info to pass the club filter.

4. **Seed a club id**. The schema treats `club_id` as required so we're multi-club ready, but v1 hardcodes one. Pick any UUID — e.g. run in the SQL editor:
   ```sql
   select gen_random_uuid();
   ```
   and put it in `.env.local` as `NEXT_PUBLIC_CLUB_ID`.

5. **Configure env**
   ```bash
   cp .env.example .env.local
   ```
   Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — project URL from Supabase → Settings → API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon (public) key from the same page
   - `NEXT_PUBLIC_CLUB_ID` — the UUID from step 4

6. **Run**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000.

## Regenerating types

`lib/database.types.ts` is hand-written to match the schema. If you change the schema, regenerate via the Supabase CLI:

```bash
supabase gen types typescript --project-id <your-project-id> > lib/database.types.ts
```

## Deploy

Push to a GitHub repo, import it in Vercel, set the three `NEXT_PUBLIC_*` env vars in the Vercel project settings. No other configuration needed.
