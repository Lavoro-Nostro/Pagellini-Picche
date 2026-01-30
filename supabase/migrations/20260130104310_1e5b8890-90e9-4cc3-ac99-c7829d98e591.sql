
-- Create events table for polls
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('allenamento', 'partita', 'evento')),
  details TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  location_name TEXT,
  location_address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance votes table
CREATE TABLE public.event_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('presente', 'assente')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies for events
CREATE POLICY "Users can view own team events"
ON public.events FOR SELECT
USING (
  team_id = get_user_team_id(auth.uid()) OR 
  team_id = get_moderator_team_id(auth.uid())
);

CREATE POLICY "Moderators can insert own team events"
ON public.events FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'moderator') AND 
  team_id = get_moderator_team_id(auth.uid())
);

CREATE POLICY "Moderators can update own team events"
ON public.events FOR UPDATE
USING (
  has_role(auth.uid(), 'moderator') AND 
  team_id = get_moderator_team_id(auth.uid())
);

CREATE POLICY "Moderators can delete own team events"
ON public.events FOR DELETE
USING (
  has_role(auth.uid(), 'moderator') AND 
  team_id = get_moderator_team_id(auth.uid())
);

-- RLS policies for attendance
CREATE POLICY "Users can view attendance for their team events"
ON public.event_attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.profiles p ON p.team_id = e.team_id
    WHERE e.id = event_attendance.event_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Players can insert own attendance"
ON public.event_attendance FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'player') AND 
  user_id = auth.uid()
);

CREATE POLICY "Players can update own attendance"
ON public.event_attendance FOR UPDATE
USING (
  has_role(auth.uid(), 'player') AND 
  user_id = auth.uid()
);

CREATE POLICY "Players can delete own attendance"
ON public.event_attendance FOR DELETE
USING (user_id = auth.uid());
