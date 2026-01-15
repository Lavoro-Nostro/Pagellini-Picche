-- Add player_role column to profiles table to store volleyball roles
ALTER TABLE public.profiles
ADD COLUMN player_role text DEFAULT NULL;

-- Add a check constraint for valid roles
ALTER TABLE public.profiles
ADD CONSTRAINT valid_player_role CHECK (
  player_role IS NULL OR player_role IN ('martello', 'opposto', 'libero', 'centrale', 'palleggio')
);