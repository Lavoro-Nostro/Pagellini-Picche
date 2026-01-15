-- Add team_id column to matches table to make matches team-specific
ALTER TABLE public.matches
ADD COLUMN team_id uuid REFERENCES public.teams(id);

-- Update existing matches to belong to New Picche team
UPDATE public.matches
SET team_id = 'fa177c8f-8ea5-49e7-9994-1e36460ae3da';

-- Make team_id NOT NULL after setting existing data
ALTER TABLE public.matches
ALTER COLUMN team_id SET NOT NULL;

-- Drop existing RLS policies on matches
DROP POLICY IF EXISTS "Everyone can view matches" ON public.matches;
DROP POLICY IF EXISTS "Moderators can delete matches" ON public.matches;
DROP POLICY IF EXISTS "Moderators can insert matches" ON public.matches;
DROP POLICY IF EXISTS "Moderators can update matches" ON public.matches;

-- Create new RLS policies for team-specific matches
CREATE POLICY "Users can view own team matches"
ON public.matches
FOR SELECT
USING (
  team_id = get_user_team_id(auth.uid()) OR 
  team_id = get_moderator_team_id(auth.uid())
);

CREATE POLICY "Moderators can insert own team matches"
ON public.matches
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'moderator') AND 
  team_id = get_moderator_team_id(auth.uid())
);

CREATE POLICY "Moderators can update own team matches"
ON public.matches
FOR UPDATE
USING (
  has_role(auth.uid(), 'moderator') AND 
  team_id = get_moderator_team_id(auth.uid())
);

CREATE POLICY "Moderators can delete own team matches"
ON public.matches
FOR DELETE
USING (
  has_role(auth.uid(), 'moderator') AND 
  team_id = get_moderator_team_id(auth.uid())
);