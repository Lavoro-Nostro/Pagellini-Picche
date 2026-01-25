-- Drop the overly permissive INSERT policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- Create a more restrictive INSERT policy - only allow inserts for authenticated users' own notifications
-- or via security definer functions (which bypass RLS)
CREATE POLICY "Authenticated can insert own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);