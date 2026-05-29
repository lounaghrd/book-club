-- A suggester's note explaining *why* they suggested a book. Optional, free text.
-- Shown in the book detail card; editable from the add/edit modal.

alter table public.books add column if not exists note text;
