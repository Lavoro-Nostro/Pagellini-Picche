-- Secure OneSignal REST API key from client-side reads
REVOKE SELECT (onesignal_rest_api_key) ON public.moderator_settings FROM authenticated;
REVOKE SELECT (onesignal_rest_api_key) ON public.moderator_settings FROM anon;

-- Add player_id to player_grades for stable identity
ALTER TABLE public.player_grades
ADD COLUMN IF NOT EXISTS player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill player_id based on name + team
UPDATE public.player_grades pg
SET player_id = p.id
FROM public.profiles p
JOIN public.grade_sheets gs ON gs.id = pg.grade_sheet_id
WHERE pg.player_id IS NULL
  AND p.name = pg.player_name
  AND p.team_id = gs.team_id;

-- Add voted_player_id to mvp_votes for stable identity
ALTER TABLE public.mvp_votes
ADD COLUMN IF NOT EXISTS voted_player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill voted_player_id based on name + team
UPDATE public.mvp_votes mv
SET voted_player_id = p.id
FROM public.profiles p
JOIN public.grade_sheets gs ON gs.id = mv.grade_sheet_id
WHERE mv.voted_player_id IS NULL
  AND p.name = mv.voted_player_name
  AND p.team_id = gs.team_id;
