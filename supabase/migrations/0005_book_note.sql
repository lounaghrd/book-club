-- Optional free-text note from the suggester explaining why they picked the book.
-- Shown on tap/expand in the reading list and on the pinned hero.

alter table public.books add column if not exists note text;
