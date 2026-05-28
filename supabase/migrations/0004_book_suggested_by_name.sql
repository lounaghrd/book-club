-- Keep the suggester's name on the book itself so it survives user deletion
-- and stays in sync on rename. `suggested_by_user_id` remains the canonical
-- identity link; this column is a denormalized display snapshot.

alter table public.books add column if not exists suggested_by_name text;

update public.books
set suggested_by_name = (
  select public.users.name
  from public.users
  where public.users.id = public.books.suggested_by_user_id
)
where suggested_by_user_id is not null;
