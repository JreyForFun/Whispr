-- patch_v5_shadowban.sql

-- Update match_user to check for report count
CREATE OR REPLACE FUNCTION match_user(my_session_id UUID, has_video BOOLEAN)
RETURNS TABLE (room_id UUID, partner_session_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_partner_record match_queue%ROWTYPE;
    new_room_id UUID;
    report_count INTEGER;
BEGIN
    -- 1. Shadow Ban Check
    SELECT count(*) INTO report_count
    FROM reports
    WHERE reported_id = my_session_id
    AND created_at > NOW() - INTERVAL '24 hours';

    -- If user has 3 or more reports in 24h, do NOT match them.
    -- We simply return nothing, leaving them in the queue infinite loop (Shadow Ban).
    IF report_count >= 3 THEN
        -- Optional: Maybe match them with other shadow-banned users in future?
        -- For now: Solitary Confinement.
        RETURN;
    END IF;

    -- 2. Search for a partner (Standard Logic)
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
