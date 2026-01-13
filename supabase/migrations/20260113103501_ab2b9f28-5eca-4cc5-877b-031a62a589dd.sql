-- Add team_id to grade_sheets to separate teams
ALTER TABLE public.grade_sheets ADD COLUMN team_id UUID REFERENCES public.teams(id);

-- Update existing grade sheets to belong to New Picche team
UPDATE public.grade_sheets 
SET team_id = (SELECT id FROM public.teams WHERE name = 'New Picche' LIMIT 1);

-- Make team_id NOT NULL after populating existing data
ALTER TABLE public.grade_sheets ALTER COLUMN team_id SET NOT NULL;

-- Create index for faster lookups
CREATE INDEX idx_grade_sheets_team_id ON public.grade_sheets(team_id);

-- Update RLS policies for grade_sheets to filter by team
DROP POLICY IF EXISTS "Authenticated users can view grade sheets" ON public.grade_sheets;
DROP POLICY IF EXISTS "Moderators can insert grade sheets" ON public.grade_sheets;
DROP POLICY IF EXISTS "Moderators can update grade sheets" ON public.grade_sheets;
DROP POLICY IF EXISTS "Moderators can delete grade sheets" ON public.grade_sheets;

-- Function to get user's team_id
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE id = _user_id
$$;

-- Function to get moderator's team_id (from teams table)
CREATE OR REPLACE FUNCTION public.get_moderator_team_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.teams WHERE moderator_id = _user_id LIMIT 1
$$;

-- Users can view grade sheets of their team
CREATE POLICY "Users can view own team grade sheets"
ON public.grade_sheets
FOR SELECT
USING (
  team_id = public.get_user_team_id(auth.uid()) 
  OR team_id = public.get_moderator_team_id(auth.uid())
);

-- Moderators can insert grade sheets for their team
CREATE POLICY "Moderators can insert own team grade sheets"
ON public.grade_sheets
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role) 
  AND team_id = public.get_moderator_team_id(auth.uid())
);

-- Moderators can update their team's grade sheets
CREATE POLICY "Moderators can update own team grade sheets"
ON public.grade_sheets
FOR UPDATE
USING (
  has_role(auth.uid(), 'moderator'::app_role) 
  AND team_id = public.get_moderator_team_id(auth.uid())
);

-- Moderators can delete their team's grade sheets
CREATE POLICY "Moderators can delete own team grade sheets"
ON public.grade_sheets
FOR DELETE
USING (
  has_role(auth.uid(), 'moderator'::app_role) 
  AND team_id = public.get_moderator_team_id(auth.uid())
);