-- Check for missing player_id in player_grades
SELECT COUNT(*) AS missing_player_id
FROM public.player_grades
WHERE player_id IS NULL;

-- Check for missing voted_player_id in mvp_votes
SELECT COUNT(*) AS missing_voted_player_id
FROM public.mvp_votes
WHERE voted_player_id IS NULL;

-- Show sample rows with missing player_id
SELECT id, grade_sheet_id, player_name
FROM public.player_grades
WHERE player_id IS NULL
LIMIT 20;

-- Show sample rows with missing voted_player_id
SELECT id, grade_sheet_id, voted_player_name
FROM public.mvp_votes
WHERE voted_player_id IS NULL
LIMIT 20;
