-- Enforce uniqueness for player grades per sheet when player_id is present
CREATE UNIQUE INDEX IF NOT EXISTS ux_player_grades_sheet_player
  ON public.player_grades (grade_sheet_id, player_id)
  WHERE player_id IS NOT NULL;

-- Speed up MVP queries per sheet and player
CREATE INDEX IF NOT EXISTS idx_mvp_votes_sheet_player
  ON public.mvp_votes (grade_sheet_id, voted_player_id)
  WHERE voted_player_id IS NOT NULL;

-- Atomic MVP update to avoid partial state
CREATE OR REPLACE FUNCTION public.set_grade_sheet_mvp(
  p_grade_sheet_id uuid,
  p_grade_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'moderator'::app_role) THEN
    RAISE EXCEPTION 'Only moderators can set MVP';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.grade_sheets gs
    WHERE gs.id = p_grade_sheet_id
      AND gs.team_id = public.get_moderator_team_id(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized grade sheet';
  END IF;

  UPDATE public.player_grades
  SET is_mvp = false
  WHERE grade_sheet_id = p_grade_sheet_id;

  IF p_grade_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.player_grades
  SET is_mvp = true
  WHERE id = p_grade_id
    AND grade_sheet_id = p_grade_sheet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grade not found for this sheet';
  END IF;
END;
$$;

-- Enforce NOT NULL only if existing data is clean
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.player_grades WHERE player_id IS NULL) = 0 THEN
    ALTER TABLE public.player_grades ALTER COLUMN player_id SET NOT NULL;
  END IF;

  IF (SELECT COUNT(*) FROM public.mvp_votes WHERE voted_player_id IS NULL) = 0 THEN
    ALTER TABLE public.mvp_votes ALTER COLUMN voted_player_id SET NOT NULL;
  END IF;
END;
$$;
