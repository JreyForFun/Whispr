-- patch_v2_fix_search_path.sql

-- Fix security warning: "Function has a role mutable search_path"
-- This prevents malicious code from overriding standard functions in a compromised schema.

CREATE OR REPLACE FUNCTION match_user(my_session_id UUID, has_video BOOLEAN)
RETURNS TABLE (room_id UUID, partner_session_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Explicitly set search path
AS $$
DECLARE
    found_partner_record match_queue%ROWTYPE;
    new_room_id UUID;
BEGIN
    SELECT * INTO found_partner_record
    FROM match_queue
    WHERE session_id != match_user.my_session_id
    AND (constraints->>'has_video')::boolean = match_user.has_video
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF found_partner_record.id IS NOT NULL THEN
        new_room_id := gen_random_uuid();
        
        INSERT INTO active_rooms (id, user_a_session, user_b_session)
        VALUES (new_room_id, match_user.my_session_id, found_partner_record.session_id);

        DELETE FROM match_queue WHERE id = found_partner_record.id;
        DELETE FROM match_queue WHERE session_id = match_user.my_session_id;

        RETURN QUERY SELECT new_room_id, found_partner_record.session_id;
    ELSE
        RETURN;
    END IF;
END;
$$;

-- Fix cleanup function as well
CREATE OR REPLACE FUNCTION cleanup_dead_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM match_queue WHERE last_ping < NOW() - INTERVAL '1 minute';
$$;
