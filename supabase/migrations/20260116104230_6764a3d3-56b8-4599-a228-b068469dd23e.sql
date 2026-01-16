-- Drop the existing restrictive SELECT policy on matches
DROP POLICY IF EXISTS "Users can view own team matches" ON public.matches;

-- Create a new policy that allows all authenticated users to view all matches (for spectating)
CREATE POLICY "Authenticated users can view all matches"
ON public.matches
FOR SELECT
USING (auth.uid() IS NOT NULL);