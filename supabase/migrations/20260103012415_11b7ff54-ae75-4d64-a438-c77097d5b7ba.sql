-- Add sheet_type to grade_sheets for classica/dettagliata
ALTER TABLE public.grade_sheets ADD COLUMN sheet_type text NOT NULL DEFAULT 'dettagliata';

-- Add new grade fields to player_grades
ALTER TABLE public.player_grades ADD COLUMN attacchi numeric;
ALTER TABLE public.player_grades ADD COLUMN ricezione_difesa numeric;
ALTER TABLE public.player_grades ADD COLUMN appoggi_alzate numeric;
ALTER TABLE public.player_grades ADD COLUMN muri numeric;
ALTER TABLE public.player_grades ADD COLUMN alzate numeric;
ALTER TABLE public.player_grades ADD COLUMN player_role text;

-- Add constraint for sheet_type
ALTER TABLE public.grade_sheets ADD CONSTRAINT grade_sheets_sheet_type_check 
CHECK (sheet_type IN ('classica', 'dettagliata'));