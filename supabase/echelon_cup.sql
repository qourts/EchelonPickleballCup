-- Echelon Pickleball Cup 2026: Match Control backend (Supabase).
-- Run once in the Supabase SQL Editor. Everything lives in the private schema `echelon_cup`
-- (not exposed through the API); the website only calls the four `public.echelon_*` functions.
-- It does not touch any existing table.
-- Rollback: drop schema echelon_cup cascade; then drop the four public.echelon_* functions.

create schema if not exists echelon_cup;
revoke all on schema echelon_cup from public, anon, authenticated;

create table if not exists echelon_cup.admins (email text primary key check (email = lower(email)));

create table if not exists echelon_cup.matches (
  id text primary key,
  division text not null check (division in ('novice','low-intermediate')),
  stage text not null check (stage in ('preliminary','semifinal','bronze','gold')),
  round int not null,
  court int not null check (court between 8 and 10),
  starts_at timestamptz not null,
  home_id text check (home_id ~ '^[NL][1-6]$'),
  away_id text check (away_id ~ '^[NL][1-6]$'),
  status text not null default 'scheduled' check (status in ('scheduled','live','completed')),
  home_on_court int check (home_on_court >= 0),
  away_on_court int check (away_on_court >= 0),
  cap_reached boolean not null default false,
  home_official int check (home_official >= 0),
  away_official int check (away_official >= 0),
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists echelon_cup.score_log (
  id bigserial primary key,
  match_id text not null,
  changed_by text,
  changed_at timestamptz not null default now(),
  detail jsonb not null
);

alter table echelon_cup.admins enable row level security;
alter table echelon_cup.matches enable row level security;
alter table echelon_cup.score_log enable row level security;

insert into echelon_cup.matches (id, division, stage, round, court, starts_at, home_id, away_id) values
  ('N-R1-C8', 'novice', 'preliminary', 1, 8, '2026-11-21 09:00:00+08', 'N1', 'N2'),
  ('N-R1-C9', 'novice', 'preliminary', 1, 9, '2026-11-21 09:00:00+08', 'N3', 'N4'),
  ('N-R1-C10', 'novice', 'preliminary', 1, 10, '2026-11-21 09:00:00+08', 'N5', 'N6'),
  ('N-R2-C8', 'novice', 'preliminary', 2, 8, '2026-11-21 09:50:00+08', 'N2', 'N5'),
  ('N-R2-C9', 'novice', 'preliminary', 2, 9, '2026-11-21 09:50:00+08', 'N4', 'N6'),
  ('N-R2-C10', 'novice', 'preliminary', 2, 10, '2026-11-21 09:50:00+08', 'N1', 'N3'),
  ('N-R3-C8', 'novice', 'preliminary', 3, 8, '2026-11-21 10:40:00+08', 'N3', 'N5'),
  ('N-R3-C9', 'novice', 'preliminary', 3, 9, '2026-11-21 10:40:00+08', 'N1', 'N4'),
  ('N-R3-C10', 'novice', 'preliminary', 3, 10, '2026-11-21 10:40:00+08', 'N2', 'N6'),
  ('N-R4-C8', 'novice', 'preliminary', 4, 8, '2026-11-21 11:30:00+08', 'N2', 'N4'),
  ('N-R4-C9', 'novice', 'preliminary', 4, 9, '2026-11-21 11:30:00+08', 'N1', 'N5'),
  ('N-R4-C10', 'novice', 'preliminary', 4, 10, '2026-11-21 11:30:00+08', 'N3', 'N6'),
  ('N-R5-C8', 'novice', 'preliminary', 5, 8, '2026-11-21 12:20:00+08', 'N2', 'N3'),
  ('N-R5-C9', 'novice', 'preliminary', 5, 9, '2026-11-21 12:20:00+08', 'N4', 'N5'),
  ('N-R5-C10', 'novice', 'preliminary', 5, 10, '2026-11-21 12:20:00+08', 'N1', 'N6'),
  ('L-R1-C8', 'low-intermediate', 'preliminary', 1, 8, '2026-11-21 09:25:00+08', 'L1', 'L2'),
  ('L-R1-C9', 'low-intermediate', 'preliminary', 1, 9, '2026-11-21 09:25:00+08', 'L3', 'L4'),
  ('L-R1-C10', 'low-intermediate', 'preliminary', 1, 10, '2026-11-21 09:25:00+08', 'L5', 'L6'),
  ('L-R2-C8', 'low-intermediate', 'preliminary', 2, 8, '2026-11-21 10:15:00+08', 'L2', 'L5'),
  ('L-R2-C9', 'low-intermediate', 'preliminary', 2, 9, '2026-11-21 10:15:00+08', 'L4', 'L6'),
  ('L-R2-C10', 'low-intermediate', 'preliminary', 2, 10, '2026-11-21 10:15:00+08', 'L1', 'L3'),
  ('L-R3-C8', 'low-intermediate', 'preliminary', 3, 8, '2026-11-21 11:05:00+08', 'L3', 'L5'),
  ('L-R3-C9', 'low-intermediate', 'preliminary', 3, 9, '2026-11-21 11:05:00+08', 'L1', 'L4'),
  ('L-R3-C10', 'low-intermediate', 'preliminary', 3, 10, '2026-11-21 11:05:00+08', 'L2', 'L6'),
  ('L-R4-C8', 'low-intermediate', 'preliminary', 4, 8, '2026-11-21 11:55:00+08', 'L2', 'L4'),
  ('L-R4-C9', 'low-intermediate', 'preliminary', 4, 9, '2026-11-21 11:55:00+08', 'L1', 'L5'),
  ('L-R4-C10', 'low-intermediate', 'preliminary', 4, 10, '2026-11-21 11:55:00+08', 'L3', 'L6'),
  ('L-R5-C8', 'low-intermediate', 'preliminary', 5, 8, '2026-11-21 12:45:00+08', 'L2', 'L3'),
  ('L-R5-C9', 'low-intermediate', 'preliminary', 5, 9, '2026-11-21 12:45:00+08', 'L4', 'L5'),
  ('L-R5-C10', 'low-intermediate', 'preliminary', 5, 10, '2026-11-21 12:45:00+08', 'L1', 'L6'),
  ('N-SF1', 'novice', 'semifinal', 1, 8, '2026-11-21 13:20:00+08', null, null),
  ('N-SF2', 'novice', 'semifinal', 2, 8, '2026-11-21 13:45:00+08', null, null),
  ('N-BRONZE', 'novice', 'bronze', 1, 8, '2026-11-21 14:20:00+08', null, null),
  ('N-GOLD', 'novice', 'gold', 1, 8, '2026-11-21 14:45:00+08', null, null),
  ('L-SF1', 'low-intermediate', 'semifinal', 1, 10, '2026-11-21 13:20:00+08', null, null),
  ('L-SF2', 'low-intermediate', 'semifinal', 2, 10, '2026-11-21 13:45:00+08', null, null),
  ('L-BRONZE', 'low-intermediate', 'bronze', 1, 10, '2026-11-21 14:20:00+08', null, null),
  ('L-GOLD', 'low-intermediate', 'gold', 1, 10, '2026-11-21 14:45:00+08', null, null)
on conflict (id) do nothing;

create or replace function public.echelon_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from echelon_cup.admins where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- Public read: the published schedule and results.
create or replace function public.echelon_matches() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'division', division, 'stage', stage, 'round', round, 'court', court,
    'startsAt', to_char(starts_at at time zone 'Asia/Manila', 'YYYY-MM-DD"T"HH24:MI:SS"+08:00"'),
    'homeId', home_id, 'awayId', away_id, 'status', status,
    'onCourt', case when home_on_court is null then null else jsonb_build_object('a', home_on_court, 'b', away_on_court) end,
    'official', case when home_official is null then null else jsonb_build_object('a', home_official, 'b', away_official) end,
    'capReached', cap_reached) order by starts_at, court), '[]'::jsonb)
  from echelon_cup.matches;
$$;

-- Admin write: save a score. Official score rules:
--   preliminary/semifinal: first to 11, no deuce. At the 15-minute cap the leader's official score becomes 11.
--   bronze/gold: first to 11, win by 2, no cap.
create or replace function public.echelon_save_score(p_match text, p_status text, p_home int, p_away int, p_cap boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m echelon_cup.matches; h_off int; a_off int; hi int; lo int;
begin
  if not public.echelon_is_admin() then raise exception 'Not an admin' using errcode = '42501'; end if;
  select * into m from echelon_cup.matches where id = p_match for update;
  if not found then raise exception 'Unknown match %', p_match; end if;
  if p_status not in ('scheduled','live','completed') then raise exception 'Bad status'; end if;
  if p_status <> 'scheduled' and (m.home_id is null or m.away_id is null) then
    raise exception 'Assign both teams before scoring this match';
  end if;

  if p_status = 'scheduled' then
    h_off := null; a_off := null; p_home := null; p_away := null; p_cap := false;
  elsif p_status = 'live' then
    if p_home is null or p_away is null or p_home < 0 or p_away < 0 then raise exception 'Live scores must be 0 or more'; end if;
    h_off := null; a_off := null;
  else
    if p_home is null or p_away is null or p_home < 0 or p_away < 0 then raise exception 'Enter both scores'; end if;
    hi := greatest(p_home, p_away); lo := least(p_home, p_away);
    if m.stage in ('bronze','gold') then
      if not ((hi = 11 and lo <= 9) or (hi > 11 and hi - lo = 2)) then
        raise exception 'Medal match: first to 11, win by 2 (got % - %)', p_home, p_away;
      end if;
      h_off := p_home; a_off := p_away; p_cap := false;
    elsif p_cap then
      if p_home = p_away then raise exception 'A tie at the cap is not final: play until one team leads'; end if;
      if hi > 11 then raise exception 'A capped match cannot exceed 11 points'; end if;
      h_off := case when p_home > p_away then 11 else p_home end;
      a_off := case when p_away > p_home then 11 else p_away end;
    else
      if not (hi = 11 and lo <= 10) then raise exception 'First to 11, no deuce (got % - %)', p_home, p_away; end if;
      h_off := p_home; a_off := p_away;
    end if;
  end if;

  update echelon_cup.matches set status = p_status, home_on_court = p_home, away_on_court = p_away,
    cap_reached = coalesce(p_cap, false), home_official = h_off, away_official = a_off,
    updated_at = now(), updated_by = lower(auth.jwt() ->> 'email') where id = p_match;
  insert into echelon_cup.score_log (match_id, changed_by, detail) values
    (p_match, lower(auth.jwt() ->> 'email'), jsonb_build_object('status', p_status, 'home', p_home, 'away', p_away, 'cap', p_cap, 'official', jsonb_build_array(h_off, a_off)));
  return jsonb_build_object('ok', true, 'official', jsonb_build_object('a', h_off, 'b', a_off));
end $$;

-- Admin write: assign teams to a semifinal, Bronze or Gold match (preliminary pairings are fixed).
create or replace function public.echelon_set_teams(p_match text, p_home text, p_away text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m echelon_cup.matches;
begin
  if not public.echelon_is_admin() then raise exception 'Not an admin' using errcode = '42501'; end if;
  select * into m from echelon_cup.matches where id = p_match for update;
  if not found then raise exception 'Unknown match %', p_match; end if;
  if m.stage = 'preliminary' then raise exception 'Preliminary pairings are fixed'; end if;
  if p_home is null or p_away is null or p_home = p_away
     or left(p_home, 1) <> upper(left(m.division, 1)) or left(p_away, 1) <> upper(left(m.division, 1)) then
    raise exception 'Pick two different teams from the % division', m.division;
  end if;
  if m.status <> 'scheduled' then raise exception 'Reset the match to scheduled before changing its teams'; end if;
  update echelon_cup.matches set home_id = p_home, away_id = p_away, updated_at = now(), updated_by = lower(auth.jwt() ->> 'email') where id = p_match;
  insert into echelon_cup.score_log (match_id, changed_by, detail) values
    (p_match, lower(auth.jwt() ->> 'email'), jsonb_build_object('teams', jsonb_build_array(p_home, p_away)));
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.echelon_is_admin() from public, anon;
revoke all on function public.echelon_save_score(text, text, int, int, boolean) from public, anon;
revoke all on function public.echelon_set_teams(text, text, text) from public, anon;
grant execute on function public.echelon_matches() to anon, authenticated;
grant execute on function public.echelon_is_admin() to authenticated;
grant execute on function public.echelon_save_score(text, text, int, int, boolean) to authenticated;
grant execute on function public.echelon_set_teams(text, text, text) to authenticated;

-- ADD ADMINS (lowercase emails of the people you also create under Authentication > Users):
-- insert into echelon_cup.admins (email) values ('name@example.com');
