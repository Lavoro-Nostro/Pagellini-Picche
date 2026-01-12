-- Create matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL,
  opponent TEXT NOT NULL,
  location_name TEXT NOT NULL,
  location_address TEXT NOT NULL,
  is_home BOOLEAN NOT NULL DEFAULT false,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Everyone can view matches
CREATE POLICY "Everyone can view matches"
ON public.matches
FOR SELECT
USING (true);

-- Moderators can insert matches
CREATE POLICY "Moderators can insert matches"
ON public.matches
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- Moderators can update matches
CREATE POLICY "Moderators can update matches"
ON public.matches
FOR UPDATE
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Moderators can delete matches
CREATE POLICY "Moderators can delete matches"
ON public.matches
FOR DELETE
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Insert the matches data
INSERT INTO public.matches (match_date, match_time, opponent, location_name, location_address, is_home) VALUES
('2026-01-20', '21:00', 'KK Lupo Alberto', 'IC Teresa Sarti', 'Largo Franco Bignotti, 10', false),
('2026-01-21', '21:00', 'Cam Volley Live', 'Pallavicini', 'Via Don Pasquino Borghi, 175', false),
('2026-02-06', '20:45', 'Todoloco', 'SMS Gaio Cecilio', 'Via Vestricio Spurrina, 152', true),
('2026-02-09', '21:25', 'KK 30TMCAP', 'IC De Finetti', 'Via B. De Finetti, 170/A', false),
('2026-02-18', '20:45', 'KK Thunder', 'SE D''Antona Biagi', 'Via di Grottaperfetta, 629', false),
('2026-02-27', '20:45', 'Multimedia Marconi', 'SMS Gaio Cecilio', 'Via Vestricio Spurrina, 152', true),
('2026-03-06', '21:00', 'Pink Panthers Duemila12', 'SE Rosalba Carriera', 'Via Orazio Console', false),
('2026-03-13', '20:45', 'ASD Tecno-Sport Pinguini', 'SMS Gaio Cecilio', 'Via Vestricio Spurrina, 152', true);