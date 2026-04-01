-- Run in Supabase: SQL Editor → New query → paste → Run.
-- Table + RLS for Chinese Stroop cross-device leaderboard (PostgREST).

create table if not exists public.stroop_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  level int not null,
  accuracy_pct int not null,
  time_completed_sec numeric not null,
  constraint stroop_scores_name_len check (char_length(name) <= 40),
  constraint stroop_scores_level check (level in (1, 2, 3)),
  constraint stroop_scores_accuracy check (accuracy_pct >= 0 and accuracy_pct <= 100),
  constraint stroop_scores_time check (time_completed_sec >= 0)
);

create index if not exists stroop_scores_level_rank_idx
  on public.stroop_scores (level, accuracy_pct desc, time_completed_sec asc);

alter table public.stroop_scores enable row level security;

-- Anonymous clients may insert one row at a time (validated by CHECK constraints).
create policy "Allow anon insert stroop_scores"
  on public.stroop_scores
  for insert
  to anon
  with check (true);

-- Public read for leaderboard UI.
create policy "Allow anon select stroop_scores"
  on public.stroop_scores
  for select
  to anon
  using (true);

-- No UPDATE/DELETE for anon (moderation uses service role in dashboard if needed).

-- If PostgREST returns permission errors, ensure grants (often already set in Supabase):
-- grant usage on schema public to anon;
-- grant select, insert on public.stroop_scores to anon;
