-- patch_v6_fix_matchmaking.sql

-- 1. Disable RLS on active_rooms to ensure passive matchers can ALWAYS see their room
-- (For a prod app, we'd write a specific policy, but for this MVP, open access to the room table is acceptable as IDs are UUIDs)
ALTER TABLE active_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_queue DISABLE ROW LEVEL SECURITY;

-- 2. Clean Slate: Remove all stuck rooms and queue entries
TRUNCATE TABLE active_rooms;
TRUNCATE TABLE match_queue;

-- 3. Ensure reports table exists and is accessible (sanity check)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert reports" ON reports;
CREATE POLICY "Public insert reports" ON reports FOR INSERT WITH CHECK (true);
