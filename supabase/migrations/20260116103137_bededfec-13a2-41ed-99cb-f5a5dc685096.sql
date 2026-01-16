-- Allow moderators to update profiles in their team
CREATE POLICY "Moderators can update team profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'moderator'::app_role) 
  AND team_id = get_moderator_team_id(auth.uid())
);