-- Keep the suggester's name on the book itself so it survives user deletion
-- and stays in sync on rename. `suggested_by_user_id` remains the canonical
-- identity link; this column is a denormalized display snapshot.

alter table public.books add column suggested_by_name text;

update public.books b
set suggested_by_name = u.name
from public.users u
where b.suggested_by_user_id = u.id;
