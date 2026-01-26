-- Create table for moderator settings (OneSignal keys)
CREATE TABLE IF NOT EXISTS public.moderator_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  onesignal_app_id text,
  onesignal_rest_api_key text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_id)
);

-- Enable RLS on moderator_settings
ALTER TABLE public.moderator_settings ENABLE ROW LEVEL SECURITY;

-- Policies for moderator_settings
CREATE POLICY "Moderators can view own settings" ON public.moderator_settings
  FOR SELECT USING (team_id = get_moderator_team_id(auth.uid()));

CREATE POLICY "Moderators can insert own settings" ON public.moderator_settings
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'moderator') AND team_id = get_moderator_team_id(auth.uid()));

CREATE POLICY "Moderators can update own settings" ON public.moderator_settings
  FOR UPDATE USING (has_role(auth.uid(), 'moderator') AND team_id = get_moderator_team_id(auth.uid()));

-- Create table for player MVP votes
CREATE TABLE IF NOT EXISTS public.mvp_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_sheet_id uuid REFERENCES public.grade_sheets(id) ON DELETE CASCADE NOT NULL,
  voter_id uuid NOT NULL,
  voted_player_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(grade_sheet_id, voter_id)
);

-- Enable RLS on mvp_votes
ALTER TABLE public.mvp_votes ENABLE ROW LEVEL SECURITY;

-- Policies for mvp_votes
CREATE POLICY "Players can view mvp votes for their team" ON public.mvp_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.grade_sheets gs
      JOIN public.profiles p ON p.team_id = gs.team_id
      WHERE gs.id = mvp_votes.grade_sheet_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Players can insert own vote" ON public.mvp_votes
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'player') AND voter_id = auth.uid()
  );

CREATE POLICY "Players can update own vote" ON public.mvp_votes
  FOR UPDATE USING (
    has_role(auth.uid(), 'player') AND voter_id = auth.uid()
  );

CREATE POLICY "Players can delete own vote" ON public.mvp_votes
  FOR DELETE USING (voter_id = auth.uid());