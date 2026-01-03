-- Enable RLS on users table (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create restrictive policy: only the user can see their own row (without password exposure)
CREATE POLICY "Users can only view own data"
ON public.users
FOR SELECT
USING (false);

-- No one can read passwords - table is completely locked down
-- If you need user data, use the profiles table instead

-- Block all INSERT/UPDATE/DELETE from regular users
CREATE POLICY "No public insert on users"
ON public.users
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No public update on users"
ON public.users
FOR UPDATE
USING (false);

CREATE POLICY "No public delete on users"
ON public.users
FOR DELETE
USING (false);