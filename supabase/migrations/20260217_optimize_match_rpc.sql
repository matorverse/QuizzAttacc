-- Atomic Match Join & Question Assignment Stored Procedure
-- Replaces multiple client DB roundtrips with single atomic Postgres transaction

CREATE OR REPLACE FUNCTION join_and_setup_match(
    p_match_id UUID,
    p_player2_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_room_id UUID;
    v_status match_status;
    v_player1_id UUID;
    v_player2_existing UUID;
    v_topic TEXT;
    v_difficulty difficulty_level;
    v_question_count INTEGER;
    v_time_per_question INTEGER;
    v_host_name TEXT;
    v_selected_question_ids UUID[];
    v_now TIMESTAMPTZ := NOW();
    v_q_id UUID;
    v_order INTEGER := 1;
BEGIN
    -- Select match details and lock row for update
    SELECT room_id, status, player1_id, player2_id
    INTO v_room_id, v_status, v_player1_id, v_player2_existing
    FROM matches
    WHERE id = p_match_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    IF v_status != 'waiting' THEN
        RAISE EXCEPTION 'Match is not in waiting state';
    END IF;

    IF v_player2_existing IS NOT NULL THEN
        RAISE EXCEPTION 'Match room is already full';
    END IF;

    IF v_player1_id = p_player2_id THEN
        RAISE EXCEPTION 'Host cannot join as player 2';
    END IF;

    -- Fetch room configuration
    SELECT topic, difficulty, question_count, time_per_question
    INTO v_topic, v_difficulty, v_question_count, v_time_per_question
    FROM rooms
    WHERE id = v_room_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room configuration not found';
    END IF;

    -- Update match status and assign player2
    UPDATE matches
    SET player2_id = p_player2_id,
        status = 'active',
        started_at = v_now,
        updated_at = v_now
    WHERE id = p_match_id;

    -- Select random questions with fallback cascade inside Postgres
    -- Level 1: Topic + Difficulty match
    SELECT ARRAY_AGG(id) INTO v_selected_question_ids
    FROM (
        SELECT id FROM questions
        WHERE topic = v_topic AND difficulty = v_difficulty
        ORDER BY RANDOM()
        LIMIT v_question_count
    ) q;

    -- Level 2: Topic match if insufficient
    IF v_selected_question_ids IS NULL OR CARDINALITY(v_selected_question_ids) < v_question_count THEN
        SELECT ARRAY_AGG(id) INTO v_selected_question_ids
        FROM (
            SELECT id FROM questions
            WHERE topic = v_topic
            ORDER BY RANDOM()
            LIMIT v_question_count
        ) q;
    END IF;

    -- Level 3: All questions if still insufficient
    IF v_selected_question_ids IS NULL OR CARDINALITY(v_selected_question_ids) < v_question_count THEN
        SELECT ARRAY_AGG(id) INTO v_selected_question_ids
        FROM (
            SELECT id FROM questions
            ORDER BY RANDOM()
            LIMIT v_question_count
        ) q;
    END IF;

    IF v_selected_question_ids IS NULL OR CARDINALITY(v_selected_question_ids) < v_question_count THEN
        RAISE EXCEPTION 'Not enough questions in database';
    END IF;

    -- Bulk insert match questions
    FOREACH v_q_id IN ARRAY v_selected_question_ids
    LOOP
        INSERT INTO match_questions (match_id, question_id, question_order, started_at)
        VALUES (
            p_match_id,
            v_q_id,
            v_order,
            CASE WHEN v_order = 1 THEN v_now ELSE NULL END
        );
        v_order := v_order + 1;
    END LOOP;

    -- Get host display name
    SELECT display_name INTO v_host_name
    FROM players
    WHERE id = v_player1_id;

    RETURN jsonb_build_object(
        'success', true,
        'matchId', p_match_id,
        'playerId', p_player2_id,
        'opponent', jsonb_build_object(
            'id', v_player1_id,
            'displayName', COALESCE(v_host_name, 'Host')
        ),
        'roomSettings', jsonb_build_object(
            'topic', v_topic,
            'difficulty', v_difficulty,
            'questionCount', v_question_count,
            'timePerQuestion', v_time_per_question
        )
    );
END;
$$;
