-- Add missing FK constraints on job_cards for assigned_to and supervised_by
-- These were stored as plain UUIDs with no FK, breaking PostgREST profile joins
-- Without these, queries like profiles!job_cards_assigned_to_fkey(...) silently fail
-- and return null/empty data for the entire query.

ALTER TABLE public.job_cards
  ADD CONSTRAINT job_cards_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.job_cards
  ADD CONSTRAINT job_cards_supervised_by_fkey
    FOREIGN KEY (supervised_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
