-- patch_v1_add_unique_constraint.sql

-- The 'onConflict: session_id' in the code requires a UNIQUE constraint on that column.
ALTER TABLE match_queue 
ADD CONSTRAINT match_queue_session_id_key UNIQUE (session_id);

-- Optional: If you want to clean up duplicates first (though likely none if empty)
-- DELETE FROM match_queue a USING match_queue b WHERE a.id < b.id AND a.session_id = b.session_id;
