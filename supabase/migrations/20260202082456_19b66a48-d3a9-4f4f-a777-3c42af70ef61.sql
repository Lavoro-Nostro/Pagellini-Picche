-- Add foreign key from event_attendance.user_id to profiles.id
ALTER TABLE public.event_attendance
ADD CONSTRAINT event_attendance_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;