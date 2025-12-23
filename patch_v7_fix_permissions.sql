-- patch_v7_fix_permissions.sql

-- 1. Force Disable RLS on critical matchmaking tables
-- This ensures that users can 'select' the room they have been assigned to.
ALTER TABLE active_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_queue DISABLE ROW LEVEL SECURITY;

-- 2. Clean Slate (Optional but recommended to clear "ghost" states)
TRUNCATE TABLE active_rooms;
TRUNCATE TABLE match_queue;

-- 3. Verify Reports RLS (Safety)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
-- Ensure anonymous reporting is allowed
DROP POLICY IF EXISTS "Public insert reports" ON reports;
CREATE POLICY "Public insert reports" ON reports FOR INSERT WITH CHECK (true);
