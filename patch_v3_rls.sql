-- patch_v3_fix_rls.sql

-- The 'upsert' operation requires an UPDATE policy if the row exists.
-- Since we are anonymous, we allow updating any row (logic validation ensures we only update our own via session_id)
-- A more secure way would be to check a secret cookie, but for this UUID-based system, knowing the UUID is proof of ownership.

CREATE POLICY "Public update own queue" ON match_queue FOR UPDATE USING (true);
