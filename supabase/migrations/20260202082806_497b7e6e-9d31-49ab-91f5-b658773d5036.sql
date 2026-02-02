-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view attendance for their team events" ON public.event_attendance;

-- Create a new SELECT policy that works for both players and moderators
CREATE POLICY "Users can view attendance for their team events" 
ON public.event_attendance 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_attendance.event_id
    AND (
      -- Players: their profile.team_id matches the event's team_id
      e.team_id = get_user_team_id(auth.uid())
      OR
      -- Moderators: they own the team that the event belongs to
      e.team_id = get_moderator_team_id(auth.uid())
    )
  )
);