-- Create app_role enum for role management
CREATE TYPE public.app_role AS ENUM ('moderator', 'player');

-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS policies for user_roles (users can only view their own role)
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Drop all insecure public policies on grade_sheets
DROP POLICY IF EXISTS "Allow public delete on grade_sheets" ON public.grade_sheets;
DROP POLICY IF EXISTS "Allow public insert on grade_sheets" ON public.grade_sheets;
DROP POLICY IF EXISTS "Allow public read on grade_sheets" ON public.grade_sheets;
DROP POLICY IF EXISTS "Allow public update on grade_sheets" ON public.grade_sheets;

-- Drop all insecure public policies on player_grades
DROP POLICY IF EXISTS "Allow public delete on player_grades" ON public.player_grades;
DROP POLICY IF EXISTS "Allow public insert on player_grades" ON public.player_grades;
DROP POLICY IF EXISTS "Allow public read on player_grades" ON public.player_grades;
DROP POLICY IF EXISTS "Allow public update on player_grades" ON public.player_grades;

-- Drop insecure public policy on users table
DROP POLICY IF EXISTS "Allow public read on users" ON public.users;

-- Create secure RLS policies for grade_sheets
CREATE POLICY "Authenticated users can view grade sheets"
  ON public.grade_sheets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Moderators can insert grade sheets"
  ON public.grade_sheets FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update grade sheets"
  ON public.grade_sheets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can delete grade sheets"
  ON public.grade_sheets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

-- Create secure RLS policies for player_grades
CREATE POLICY "Authenticated users can view player grades"
  ON public.player_grades FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Moderators can insert player grades"
  ON public.player_grades FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update player grades"
  ON public.player_grades FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can delete player grades"
  ON public.player_grades FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));