-- Add sheet_category to grade_sheets (allenamento or partita)
ALTER TABLE public.grade_sheets 
ADD COLUMN sheet_category text NOT NULL DEFAULT 'allenamento' CHECK (sheet_category IN ('allenamento', 'partita'));

-- Add gym_location for training sessions
ALTER TABLE public.grade_sheets 
ADD COLUMN gym_location text CHECK (gym_location IN ('Spurinna', 'Don Rua', 'Argan', NULL));

-- Add match_result for match grade sheets (e.g., "3-1")
ALTER TABLE public.grade_sheets 
ADD COLUMN match_result text;

-- Add set_scores as JSON array for storing set-by-set scores
ALTER TABLE public.grade_sheets 
ADD COLUMN set_scores jsonb;

-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  related_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can insert notifications (via triggers or functions)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Add is_mvp column to player_grades for MVP voting
ALTER TABLE public.player_grades
ADD COLUMN is_mvp boolean NOT NULL DEFAULT false;

-- Create function to notify team players when a grade sheet is created
CREATE OR REPLACE FUNCTION public.notify_team_on_grade_sheet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  player_record RECORD;
  sheet_category_display text;
BEGIN
  -- Get display text for category
  IF NEW.sheet_category = 'partita' THEN
    sheet_category_display := 'Partita';
  ELSE
    sheet_category_display := 'Allenamento';
  END IF;
  
  -- Get all players in the same team
  FOR player_record IN
    SELECT p.id
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.team_id = NEW.team_id
      AND ur.role = 'player'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      player_record.id,
      'Nuovo Pagellino Pubblicato',
      'È stato pubblicato un nuovo pagellino (' || sheet_category_display || ') del ' || to_char(NEW.sheet_date, 'DD/MM/YYYY'),
      'grade_sheet',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger to call notification function
CREATE TRIGGER on_grade_sheet_created
AFTER INSERT ON public.grade_sheets
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_on_grade_sheet();