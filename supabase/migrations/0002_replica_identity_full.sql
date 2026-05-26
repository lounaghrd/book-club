-- Realtime DELETE events only include the primary key in the `old` record by
-- default, so subscriptions filtered by club_id drop deletes (the filter
-- column isn't in the payload). REPLICA IDENTITY FULL ships the full old row
-- so the filter matches and clients see deletions live.

alter table public.books replica identity full;
alter table public.current_reading replica identity full;
