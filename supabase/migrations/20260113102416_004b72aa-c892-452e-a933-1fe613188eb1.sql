-- Create teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    moderator_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Everyone can view teams
CREATE POLICY "Everyone can view teams"
ON public.teams
FOR SELECT
USING (true);

-- Moderators can manage their own team
CREATE POLICY "Moderators can update own team"
ON public.teams
FOR UPDATE
USING (auth.uid() = moderator_id);

-- Add team_id to profiles
ALTER TABLE public.profiles ADD COLUMN team_id UUID REFERENCES public.teams(id);

-- Create index for faster lookups
CREATE INDEX idx_profiles_team_id ON public.profiles(team_id);