-- whispr_schema_v1.sql
-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Match Queue Table
CREATE TABLE IF NOT EXISTS match_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    constraints JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_match_queue_created ON match_queue (created_at ASC);

-- 3. Active Rooms Table
CREATE TABLE IF NOT EXISTS active_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_session UUID NOT NULL,
    user_b_session UUID NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- 4. RLS Policies
ALTER TABLE match_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_rooms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to join the queue (anonymous)
CREATE POLICY "Public request match" ON match_queue FOR INSERT WITH CHECK (true);

-- Allow users to see their own status
CREATE POLICY "Public read own queue" ON match_queue FOR SELECT USING (true); 
CREATE POLICY "Public delete own queue" ON match_queue FOR DELETE USING (true); 
CREATE POLICY "Public update own queue" ON match_queue FOR UPDATE USING (true); 

CREATE POLICY "Public read own room" ON active_rooms FOR SELECT USING (true);

-- 5. Matchmaking RPC Function (Atomic)
CREATE OR REPLACE FUNCTION match_user(my_session_id UUID, has_video BOOLEAN)
RETURNS TABLE (room_id UUID, partner_session_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_partner_record match_queue%ROWTYPE;
    new_room_id UUID;
BEGIN
    -- Search for a partner, ensuring we don't pick ourselves
    -- SKIP LOCKED prevents race conditions where two users grab the same partner
    SELECT * INTO found_partner_record
    FROM match_queue
    WHERE session_id != match_user.my_session_id
    AND (constraints->>'has_video')::boolean = match_user.has_video
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF found_partner_record.id IS NOT NULL THEN
        -- Match found! Create a room.
        new_room_id := gen_random_uuid();
        
        INSERT INTO active_rooms (id, user_a_session, user_b_session)
        VALUES (new_room_id, match_user.my_session_id, found_partner_record.session_id);

        -- Remove both from queue
        DELETE FROM match_queue WHERE id = found_partner_record.id;
        DELETE FROM match_queue WHERE session_id = match_user.my_session_id;

        -- Return the result
        RETURN QUERY SELECT new_room_id, found_partner_record.session_id;
    ELSE
        -- No match found, do nothing (client keeps polling/waiting)
        RETURN;
    END IF;
END;
$$;

-- 6. Cleanup Function (To be called by Cron/Edge)
CREATE OR REPLACE FUNCTION cleanup_dead_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM match_queue WHERE last_ping < NOW() - INTERVAL '1 minute';
    -- Mark rooms as ended if needed, though strictly we rely on signaling
$$;
