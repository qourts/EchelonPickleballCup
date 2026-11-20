-- Echelon Pickleball Cup 2026: Match Control upgrade (run once, after echelon_cup.sql).
-- Adds: Start / Undo start, live point-by-point scores, Confirm result, Forfeit, Reopen and
-- Reset with a reason, court moves, match notes, a full activity log, scorer/supervisor roles
-- and protection against two people saving the same match at once.
-- Keeps every match, score and admin already recorded. Existing admins become supervisors.

-- Roles: scorers record matches; supervisors can also reopen and reset confirmed results.
alter table echelon_cup.admins add column if not exists role text not null default 'supervisor'
  check (role in ('scorer', 'supervisor'));

alter table echelon_cup.matches
  add column if not exists version int not null default 0,
  add column if not exists planned_court int,
  add column if not exists note text check (char_length(note) <= 500),
  add column if not exists note_public boolean not null default false,
  add column if not exists started_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists forfeit boolean not null default false;
update echelon_cup.matches set planned_court = court where planned_court is null;
alter table echelon_cup.matches drop constraint if exists matches_court_check;
alter table echelon_cup.matches add constraint matches_court_check check (court between 1 and 10);

alter table echelon_cup.score_log
  add column if not exists action text,
  add column if not exists reason text;

-- The old one-step score function is replaced by the functions below.
drop function if exists public.echelon_save_score(text, text, int, int, boolean);
drop function if exists public.echelon_set_teams(text, text, text);

create or replace function public.echelon_admin_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from echelon_cup.admins where email = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- Lock the match, check the caller's role and that nobody else changed it since they loaded it.
create or replace function echelon_cup.claim(p_match text, p_version int, p_need text)
returns echelon_cup.matches language plpgsql security definer set search_path = '' set lock_timeout = '4s' as $$
declare r text; m echelon_cup.matches;
begin
  r := public.echelon_admin_role();
  if r is null then raise exception 'Not an admin' using errcode = '42501'; end if;
  if p_need = 'supervisor' and r <> 'supervisor' then
    raise exception 'Only a supervisor can do this' using errcode = '42501';
  end if;
  select * into m from echelon_cup.matches where id = p_match for update;
  if not found then raise exception 'Unknown match %', p_match; end if;
  if m.version <> p_version then
    raise exception 'This match was changed by someone else. The latest score has been loaded.' using errcode = '40001';
  end if;
  return m;
end $$;

create or replace function echelon_cup.log(p_match text, p_action text, p_reason text, p_detail jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into echelon_cup.score_log (match_id, changed_by, action, reason, detail)
  values (p_match, lower(auth.jwt() ->> 'email'), p_action, nullif(trim(p_reason), ''), coalesce(p_detail, '{}'::jsonb));
$$;

-- Official result rules. Preliminaries and semifinals: first to 11, no deuce; at the 15-minute
-- cap the leader's official score becomes 11. Gold and Bronze: first to 11, win by 2, no cap.
create or replace function echelon_cup.official(p_stage text, p_home int, p_away int, p_cap boolean)
returns int[] language plpgsql immutable set search_path = '' as $$
declare hi int; lo int;
begin
  if p_home is null or p_away is null or p_home < 0 or p_away < 0 then raise exception 'Enter both scores'; end if;
  hi := greatest(p_home, p_away); lo := least(p_home, p_away);
  if p_stage in ('bronze', 'gold') then
    if not ((hi = 11 and lo <= 9) or (hi > 11 and hi - lo = 2)) then
      raise exception 'Medal match: first to 11, win by 2 (got % - %)', p_home, p_away;
    end if;
    return array[p_home, p_away];
  end if;
  if p_cap then
    if p_home = p_away then raise exception 'A tie at the cap is not final: play until one team leads'; end if;
    if hi > 11 then raise exception 'A capped match cannot exceed 11 points'; end if;
    return array[case when p_home > p_away then 11 else p_home end, case when p_away > p_home then 11 else p_away end];
  end if;
  if not (hi = 11 and lo <= 10) then raise exception 'First to 11, no deuce (got % - %)', p_home, p_away; end if;
  return array[p_home, p_away];
end $$;

create or replace function echelon_cup.touch(p_match text) returns jsonb
language sql security definer set search_path = '' as $$
  update echelon_cup.matches set version = version + 1, updated_at = now(), updated_by = lower(auth.jwt() ->> 'email')
  where id = p_match returning jsonb_build_object('ok', true, 'version', version);
$$;

create or replace function public.echelon_start(p_match text, p_version int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m echelon_cup.matches;
begin
  m := echelon_cup.claim(p_match, p_version, 'scorer');
  if m.status <> 'scheduled' then raise exception 'Only a scheduled match can be started'; end if;
  if m.home_id is null or m.away_id is null then raise exception 'Choose both pairs before starting this match'; end if;
  update echelon_cup.matches set status = 'live', home_on_court = 0, away_on_court = 0, cap_reached = false,
    started_at = now() where id = p_match;
  perform echelon_cup.log(p_match, 'start', null, '{}'::jsonb);
  return echelon_cup.touch(p_match);
end $$;

create or replace function public.echelon_undo_start(p_match text, p_version int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m echelon_cup.matches;
begin
  m := echelon_cup.claim(p_match, p_version, 'scorer');
  if m.status <> 'live' or coalesce(m.home_on_court, 0) + coalesce(m.away_on_court, 0) > 0 then
    raise exception 'Undo start is only possible before the first point';
  end if;
  update echelon_cup.matches set status = 'scheduled', home_on_court = null, away_on_court = null, started_at = null
  where id = p_match;
  perform echelon_cup.log(p_match, 'undo-start', null, '{}'::jsonb);
  return echelon_cup.touch(p_match);
end $$;

create or replace function public.echelon_live_score(p_match text, p_version int, p_home int, p_away int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m echelon_cup.matches;
begin
  m := echelon_cup.claim(p_match, p_version, 'scorer');
  if m.status <> 'live' then raise exception 'Start the match before scoring it'; end if;
  if p_home is null or p_away is null or p_home < 0 or p_away < 0 or p_home > 40 or p_away > 40 then
    raise exception 'Scores must be between 0 and 40';
  end if;
  update echelon_cup.matches set home_on_court = p_home, away_on_court = p_away where id = p_match;
  perform echelon_cup.log(p_match, 'score', null, jsonb_build_object('home', p_home, 'away', p_away));
  return echelon_cup.touch(p_match);
end $$;

create or replace function public.echelon_confirm(p_match text, p_version int, p_home int, p_away int, p_cap boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m echelon_cup.matches; o int[];
begin
  m := echelon_cup.claim(p_match, p_version, 'scorer');
  if m.status <> 'live' then raise exception 'Only a live match can be confirmed'; end if;
  o := echelon_cup.official(m.stage, p_home, p_away, coalesce(p_cap, false) and m.stage not in ('bronze', 'gold'));
  update echelon_cup.matches set status = 'completed', home_on_court = p_home, away_on_court = p_away,
    cap_reached = coalesce(p_cap, false) and m.stage not in ('bronze', 'gold'),
    home_official = o[1], away_official = o[2], confirmed_at = now(), forfeit = false
  where id = p_match;
  perform echelon_cup.log(p_match, 'confirm', null,
    jsonb_build_object('home', p_home, 'away', p_away, 'cap', p_cap, 'official', to_jsonb(o)));
  return echelon_cup.touch(p_match);
end $$;

-- Forfeit (no-show, injury): the present pair wins with the score Match Control records.
create or replace function public.echelon_forfeit(p_match text, p_version int, p_home int, p_away int, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m echelon_cup.matches;
begin
  m := echelon_cup.claim(p_match, p_version, 'scorer');
  if m.status = 'completed' then raise exception 'Reopen the match before recording a forfeit'; end if;
  if m.home_id is null or m.away_id is null then raise exception 'Choose both pairs first'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Give a reason for the forfeit'; end if;
  if p_home is null or p_away is null or p_home < 0 or p_away < 0 or p_home = p_away then
    raise exception 'The winning pair must have more points';
  end if;
  update echelon_cup.matches set status = 'completed', home_on_court = p_home, away_on_court = p_away,
    home_official = p_home, away_official = p_away, cap_reached = false, forfeit = true,
    started_at = coalesce(started_at, now()), confirmed_at = now()
  where id = p_match;
  perform echelon_cup.log(p_match, 'forfeit', p_reason, jsonb_build_object('home', p_home, 'away', p_away));
  return echelon_cup.touch(p_match);
end $$;

create or replace function public.echelon_reopen(p_match text, p_version int, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m echelon_cup.matches;
begin
  m := echelon_cup.claim(p_match, p_version, 'supervisor');
  if m.status <> 'completed' then raise exception 'Only a confirmed match can be reopened'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Give a reason for reopening'; end if;
  update echelon_cup.matches set status = 'live', home_official = null, away_official = null,
    confirmed_at = null, forfeit = false
  where id = p_match;
  perform echelon_cup.log(p_match, 'reopen', p_reason,
    jsonb_build_object('was', jsonb_build_array(m.home_official, m.away_official)));
  return echelon_cup.touch(p_match);
end $$;

create or replace function public.echelon_reset(p_match text, p_version int, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m echelon_cup.matches;
begin
  m := echelon_cup.claim(p_match, p_version,
    case when (select status from echelon_cup.matches where id = p_match) = 'completed' then 'supervisor' else 'scorer' end);
  if m.status = 'completed' and coalesce(trim(p_reason), '') = '' then raise exception 'Give a reason for resetting'; end if;
  update echelon_cup.matches set status = 'scheduled', home_on_court = null, away_on_court = null,
    home_official = null, away_official = null, cap_reached = false, forfeit = false,
    started_at = null, confirmed_at = null
  where id = p_match;
  perform echelon_cup.log(p_match, 'reset', p_reason,
    jsonb_build_object('was', jsonb_build_array(m.status, m.home_on_court, m.away_on_court)));
  return echelon_cup.touch(p_match);
end $$;

create or replace function public.echelon_set_court(p_match text, p_version int, p_court int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m echelon_cup.matches;
begin
  m := echelon_cup.claim(p_match, p_version, 'scorer');
  if m.status = 'completed' then raise exception 'A confirmed match cannot change court'; end if;
  if p_court is null or p_court < 1 or p_court > 10 then raise exception 'Pick a court from 1 to 10'; end if;
  update echelon_cup.matches set court = p_court where id = p_match;
  perform echelon_cup.log(p_match, 'court', null, jsonb_build_object('from', m.court, 'to', p_court));
  return echelon_cup.touch(p_match);
end $$;

create or replace function public.echelon_set_note(p_match text, p_version int, p_note text, p_public boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m echelon_cup.matches; n text := nullif(trim(p_note), '');
begin
  m := echelon_cup.claim(p_match, p_version, 'scorer');
  if char_length(n) > 500 then raise exception 'Notes can be up to 500 characters'; end if;
  update echelon_cup.matches set note = n, note_public = n is not null and coalesce(p_public, false) where id = p_match;
  perform echelon_cup.log(p_match, 'note', null, jsonb_build_object('note', n, 'public', n is not null and coalesce(p_public, false)));
  return echelon_cup.touch(p_match);
end $$;

-- Pairs for a semifinal, Bronze or Gold match (preliminary pairings are fixed).
create or replace function public.echelon_set_teams(p_match text, p_version int, p_home text, p_away text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m echelon_cup.matches; c text;
begin
  m := echelon_cup.claim(p_match, p_version, 'scorer');
  if m.stage = 'preliminary' then raise exception 'Preliminary pairings are fixed'; end if;
  if m.status <> 'scheduled' then raise exception 'Reset the match to scheduled before changing its pairs'; end if;
  c := upper(left(m.division, 1));
  if p_home is null or p_away is null or p_home = p_away or left(p_home, 1) <> c or left(p_away, 1) <> c then
    raise exception 'Pick two different pairs from the % division', m.division;
  end if;
  update echelon_cup.matches set home_id = p_home, away_id = p_away where id = p_match;
  perform echelon_cup.log(p_match, 'teams', null, jsonb_build_object('home', p_home, 'away', p_away));
  return echelon_cup.touch(p_match);
end $$;

-- Admin view: every field, including private notes and versions.
create or replace function public.echelon_admin_matches() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.echelon_admin_role() is null then raise exception 'Not an admin' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'division', division, 'stage', stage, 'round', round, 'court', court, 'plannedCourt', planned_court,
    'startsAt', to_char(starts_at at time zone 'Asia/Manila', 'YYYY-MM-DD"T"HH24:MI:SS"+08:00"'),
    'homeId', home_id, 'awayId', away_id, 'status', status,
    'onCourt', case when home_on_court is null then null else jsonb_build_object('a', home_on_court, 'b', away_on_court) end,
    'official', case when home_official is null then null else jsonb_build_object('a', home_official, 'b', away_official) end,
    'capReached', cap_reached, 'forfeit', forfeit, 'note', note, 'notePublic', note_public, 'version', version,
    'startedAt', started_at, 'confirmedAt', confirmed_at, 'updatedAt', updated_at, 'updatedBy', updated_by)
    order by starts_at, court), '[]'::jsonb) from echelon_cup.matches);
end $$;

create or replace function public.echelon_activity(p_limit int default 300) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.echelon_admin_role() is null then raise exception 'Not an admin' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) from (
    select id, match_id as "matchId", changed_by as "by", changed_at as "at", coalesce(action, 'score') as action, reason, detail
    from echelon_cup.score_log order by id desc limit least(greatest(coalesce(p_limit, 300), 1), 1000)) t);
end $$;

-- Public read now also carries court moves, public notes and forfeits.
create or replace function public.echelon_matches() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'division', division, 'stage', stage, 'round', round, 'court', court, 'plannedCourt', planned_court,
    'startsAt', to_char(starts_at at time zone 'Asia/Manila', 'YYYY-MM-DD"T"HH24:MI:SS"+08:00"'),
    'homeId', home_id, 'awayId', away_id, 'status', status,
    'onCourt', case when home_on_court is null then null else jsonb_build_object('a', home_on_court, 'b', away_on_court) end,
    'official', case when home_official is null then null else jsonb_build_object('a', home_official, 'b', away_official) end,
    'capReached', cap_reached, 'forfeit', forfeit,
    'note', case when note_public then note else null end) order by starts_at, court), '[]'::jsonb)
  from echelon_cup.matches;
$$;

revoke all on function echelon_cup.claim(text, int, text) from public, anon, authenticated;
revoke all on function echelon_cup.log(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function echelon_cup.official(text, int, int, boolean) from public, anon, authenticated;
revoke all on function echelon_cup.touch(text) from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'public.echelon_admin_role()',
    'public.echelon_start(text, int)',
    'public.echelon_undo_start(text, int)',
    'public.echelon_live_score(text, int, int, int)',
    'public.echelon_confirm(text, int, int, int, boolean)',
    'public.echelon_forfeit(text, int, int, int, text)',
    'public.echelon_reopen(text, int, text)',
    'public.echelon_reset(text, int, text)',
    'public.echelon_set_court(text, int, int)',
    'public.echelon_set_note(text, int, text, boolean)',
    'public.echelon_set_teams(text, int, text, text)',
    'public.echelon_admin_matches()',
    'public.echelon_activity(int)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

grant execute on function public.echelon_matches() to anon, authenticated;

-- To add a scorer (can record matches but not reopen or reset confirmed ones):
-- insert into echelon_cup.admins (email, role) values ('scorer@example.com', 'scorer');
-- To make someone a supervisor:
-- update echelon_cup.admins set role = 'supervisor' where email = 'name@example.com';
