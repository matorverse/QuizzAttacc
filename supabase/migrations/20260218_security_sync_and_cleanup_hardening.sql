-- ============================================================================
-- SECURITY, SYNC & CLEANUP HARDENING MIGRATION
-- 1. Creates questions_public view (stripping correct_answer_index)
-- 2. Adds atomic submit_player_answer RPC (server-authoritative scoring)
-- 3. Adds forfeit_match RPC (abandonment handling)
-- 4. Adds single-query cleanup_stale_rooms_and_matches RPC
-- 5. Revokes client direct inserts on match_scores
-- ============================================================================

-- 1. Public Question Projection View (Zero-Knowledge Architecture)
CREATE OR REPLACE VIEW questions_public AS
SELECT 
    id,
    topic,
    difficulty,
    question_text,
    options,
    created_at
FROM questions;

GRANT SELECT ON questions_public TO anon, authenticated, service_role;

-- 2. Revoke direct client inserts on match_scores to prevent score tampering
DROP POLICY IF EXISTS "Match players can insert scores" ON match_scores;
DROP POLICY IF EXISTS "Anyone can insert match scores" ON match_scores;

-- 3. Atomic Server-Authoritative Answer Submission & Scoring RPC
CREATE OR REPLACE FUNCTION submit_player_answer(
    p_match_id UUID,
    p_player_id UUID,
    p_question_id UUID,
    p_selected_answer_index INTEGER,
    p_time_taken_ms INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_room_id UUID;
    v_status match_status;
    v_p1_id UUID;
    v_p2_id UUID;
    v_started_at TIMESTAMPTZ;
    v_time_per_q INTEGER;
    v_total_q INTEGER;
    v_existing_answer_id UUID;
    v_correct_answer_index INTEGER;
    v_explanation TEXT;
    v_is_correct BOOLEAN;
    v_base_points INTEGER := 0;
    v_time_bonus INTEGER := 0;
    v_streak_multiplier DECIMAL(3,2) := 1.0;
    v_total_points INTEGER := 0;
    v_current_streak INTEGER := 0;
    v_prev_streak INTEGER := 0;
    v_time_limit_ms INTEGER;
    v_clamped_time INTEGER;
    v_actual_answers INTEGER;
    v_expected_answers INTEGER;
    v_match_complete BOOLEAN := false;
BEGIN
    -- Verify match exists and is active
    SELECT room_id, status, player1_id, player2_id, started_at
    INTO v_room_id, v_status, v_p1_id, v_p2_id, v_started_at
    FROM matches
    WHERE id = p_match_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not found');
    END IF;

    IF v_status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match is not active');
    END IF;

    IF v_p1_id != p_player_id AND (v_p2_id IS NULL OR v_p2_id != p_player_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player is not in this match');
    END IF;

    -- Fetch room configuration
    SELECT time_per_question, question_count
    INTO v_time_per_q, v_total_q
    FROM rooms
    WHERE id = v_room_id;

    -- Check for duplicate answer
    SELECT id INTO v_existing_answer_id
    FROM player_answers
    WHERE match_id = p_match_id AND player_id = p_player_id AND question_id = p_question_id;

    IF v_existing_answer_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Answer already submitted for this question');
    END IF;

    -- Fetch question solution from server table
    SELECT correct_answer_index, explanation
    INTO v_correct_answer_index, v_explanation
    FROM questions
    WHERE id = p_question_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Question not found');
    END IF;

    -- Determine correctness (-1 represents timeout)
    v_is_correct := (p_selected_answer_index >= 0 AND p_selected_answer_index = v_correct_answer_index);

    IF v_is_correct THEN
        v_base_points := 100;
        v_time_limit_ms := v_time_per_q * 1000;
        v_clamped_time := GREATEST(0, LEAST(p_time_taken_ms, v_time_limit_ms));
        v_time_bonus := ROUND(((v_time_limit_ms - v_clamped_time)::NUMERIC / v_time_limit_ms::NUMERIC) * 50);

        -- Calculate streak multiplier based on previous streak
        SELECT current_streak INTO v_prev_streak
        FROM match_scores
        WHERE match_id = p_match_id AND player_id = p_player_id
        ORDER BY created_at DESC
        LIMIT 1;

        v_current_streak := COALESCE(v_prev_streak, 0) + 1;

        IF v_current_streak = 1 THEN
            v_streak_multiplier := 1.0;
        ELSIF v_current_streak = 2 THEN
            v_streak_multiplier := 1.1;
        ELSE
            v_streak_multiplier := 1.3;
        END IF;

        v_total_points := ROUND((v_base_points + v_time_bonus) * v_streak_multiplier);
    ELSE
        v_base_points := 0;
        v_time_bonus := 0;
        v_streak_multiplier := 1.0;
        v_total_points := 0;
        v_current_streak := 0;
    END IF;

    -- Write answer audit log
    INSERT INTO player_answers (
        match_id, player_id, question_id,
        selected_answer_index, is_correct, time_taken_ms, submitted_at
    ) VALUES (
        p_match_id, p_player_id, p_question_id,
        p_selected_answer_index, v_is_correct, p_time_taken_ms, NOW()
    );

    -- Write authoritative score row
    INSERT INTO match_scores (
        match_id, player_id, question_id,
        base_points, time_bonus, streak_multiplier,
        total_points, current_streak
    ) VALUES (
        p_match_id, p_player_id, p_question_id,
        v_base_points, v_time_bonus, v_streak_multiplier,
        v_total_points, v_current_streak
    );

    -- Check if both players have answered all questions
    SELECT COUNT(*) INTO v_actual_answers
    FROM player_answers
    WHERE match_id = p_match_id;

    v_expected_answers := v_total_q * 2;

    IF v_actual_answers >= v_expected_answers THEN
        UPDATE matches
        SET status = 'finished',
            finished_at = NOW(),
            updated_at = NOW()
        WHERE id = p_match_id;

        v_match_complete := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'isCorrect', v_is_correct,
        'correctAnswerIndex', v_correct_answer_index,
        'explanation', v_explanation,
        'score', jsonb_build_object(
            'basePoints', v_base_points,
            'timeBonus', v_time_bonus,
            'streakMultiplier', v_streak_multiplier,
            'totalPoints', v_total_points,
            'currentStreak', v_current_streak
        ),
        'matchComplete', v_match_complete
    );
END;
$$;

-- 4. Abandonment / Forfeit Stored Procedure
CREATE OR REPLACE FUNCTION forfeit_match(
    p_match_id UUID,
    p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status match_status;
    v_p1_id UUID;
    v_p2_id UUID;
BEGIN
    SELECT status, player1_id, player2_id
    INTO v_status, v_p1_id, v_p2_id
    FROM matches
    WHERE id = p_match_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not found');
    END IF;

    IF v_status = 'finished' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Match already finished');
    END IF;

    IF v_p1_id != p_player_id AND (v_p2_id IS NULL OR v_p2_id != p_player_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player not in this match');
    END IF;

    -- Conclude match
    UPDATE matches
    SET status = 'finished',
        finished_at = NOW(),
        updated_at = NOW()
    WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true, 'matchComplete', true);
END;
$$;

-- 5. Stored Procedure for Cleanup
CREATE OR REPLACE FUNCTION cleanup_stale_rooms_and_matches()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_rooms INTEGER := 0;
    v_abandoned_waiting INTEGER := 0;
    v_abandoned_active INTEGER := 0;
BEGIN
    -- 1. Delete expired rooms
    WITH deleted AS (
        DELETE FROM rooms
        WHERE expires_at < NOW()
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_rooms FROM deleted;

    -- 2. Mark waiting matches older than 30 mins as abandoned
    WITH abandoned AS (
        UPDATE matches
        SET status = 'abandoned', updated_at = NOW()
        WHERE status = 'waiting'
          AND created_at < NOW() - INTERVAL '30 minutes'
          AND player2_id IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_abandoned_waiting FROM abandoned;

    -- 3. Mark active matches with no activity for 2 hours as abandoned
    WITH abandoned_act AS (
        UPDATE matches
        SET status = 'abandoned', updated_at = NOW()
        WHERE status = 'active'
          AND started_at < NOW() - INTERVAL '2 hours'
          AND id NOT IN (
              SELECT DISTINCT match_id FROM player_answers
              WHERE submitted_at > NOW() - INTERVAL '2 hours'
          )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_abandoned_active FROM abandoned_act;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_rooms', v_deleted_rooms,
        'abandoned_waiting', v_abandoned_waiting,
        'abandoned_active', v_abandoned_active,
        'timestamp', NOW()
    );
END;
$$;

-- Grant EXECUTE permissions
GRANT EXECUTE ON FUNCTION submit_player_answer TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION forfeit_match TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_stale_rooms_and_matches TO anon, authenticated, service_role;
