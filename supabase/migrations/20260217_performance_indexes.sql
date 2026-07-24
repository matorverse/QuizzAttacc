-- ============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================

-- 1. Fast question pool filtering by topic + difficulty
CREATE INDEX IF NOT EXISTS idx_questions_topic_diff ON questions (topic, difficulty);

-- 2. Fast match question sequence lookups
CREATE INDEX IF NOT EXISTS idx_match_questions_order ON match_questions (match_id, question_order);

-- 3. Fast active room code lookups
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms (code);

-- 4. Fast match score aggregation by player
CREATE INDEX IF NOT EXISTS idx_match_scores_match_player ON match_scores (match_id, player_id);
