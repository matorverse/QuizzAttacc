-- Quizexe Database Schema
-- Production-grade schema with RLS, indexes, and constraints

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Game state management
DROP TYPE IF EXISTS match_status CASCADE;
CREATE TYPE match_status AS ENUM ('waiting', 'active', 'finished', 'abandoned');

-- Question difficulty levels
DROP TYPE IF EXISTS difficulty_level CASCADE;
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- ============================================================================
-- TABLES
-- ============================================================================

DROP TABLE IF EXISTS match_summaries CASCADE;
DROP TABLE IF EXISTS match_scores CASCADE;
DROP TABLE IF EXISTS player_answers CASCADE;
DROP TABLE IF EXISTS match_questions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS players CASCADE;

-- Players table (anonymous auth)
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL CHECK (char_length(display_name) >= 2 AND char_length(display_name) <= 30),
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rooms table (game lobbies with expiration)
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE CHECK (char_length(code) = 6),
    host_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    difficulty difficulty_level NOT NULL,
    question_count INTEGER NOT NULL CHECK (question_count IN (5, 10, 15)),
    time_per_question INTEGER NOT NULL CHECK (time_per_question IN (10, 15, 20, 30)),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matches table (game instances with state)
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    player1_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES players(id) ON DELETE CASCADE,
    status match_status NOT NULL DEFAULT 'waiting',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- Questions table (question bank)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    difficulty difficulty_level NOT NULL,
    question_text TEXT NOT NULL CHECK (char_length(question_text) >= 10),
    options JSONB NOT NULL CHECK (jsonb_array_length(options) = 4),
    correct_answer_index INTEGER NOT NULL CHECK (correct_answer_index >= 0 AND correct_answer_index <= 3),
    explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Match questions (junction table with deterministic ordering)
CREATE TABLE match_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL CHECK (question_order > 0),
    started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(match_id, question_id),
    UNIQUE(match_id, question_order)
);

-- Player answers (audit trail for anti-cheat)
CREATE TABLE player_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_answer_index INTEGER NOT NULL CHECK (selected_answer_index >= -1 AND selected_answer_index <= 3),
    is_correct BOOLEAN NOT NULL,
    time_taken_ms INTEGER NOT NULL CHECK (time_taken_ms >= 0),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(match_id, player_id, question_id) -- One answer per player per question
);

-- Match scores (real-time score tracking)
CREATE TABLE match_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    base_points INTEGER NOT NULL DEFAULT 0 CHECK (base_points >= 0),
    time_bonus INTEGER NOT NULL DEFAULT 0 CHECK (time_bonus >= 0 AND time_bonus <= 50),
    streak_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (streak_multiplier >= 1.0 AND streak_multiplier <= 1.3),
    total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
    current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(match_id, player_id, question_id)
);

-- Match summaries (analytics table, auto-populated)
CREATE TABLE match_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
    player1_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player2_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player1_score INTEGER NOT NULL DEFAULT 0,
    player2_score INTEGER NOT NULL DEFAULT 0,
    player1_accuracy DECIMAL(5,2) NOT NULL DEFAULT 0.0 CHECK (player1_accuracy >= 0 AND player1_accuracy <= 100),
    player2_accuracy DECIMAL(5,2) NOT NULL DEFAULT 0.0 CHECK (player2_accuracy >= 0 AND player2_accuracy <= 100),
    player1_avg_time_ms INTEGER NOT NULL DEFAULT 0,
    player2_avg_time_ms INTEGER NOT NULL DEFAULT 0,
    total_duration_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Room lookups by code (frequent operation)
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_expires_at ON rooms(expires_at);

-- Match queries
CREATE INDEX idx_matches_room_id ON matches(room_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_player1_id ON matches(player1_id);
CREATE INDEX idx_matches_player2_id ON matches(player2_id);

-- Question lookups by topic and difficulty
CREATE INDEX idx_questions_topic_difficulty ON questions(topic, difficulty);

-- Match questions ordering
CREATE INDEX idx_match_questions_match_id_order ON match_questions(match_id, question_order);

-- Player answers for scoring calculations
CREATE INDEX idx_player_answers_match_player ON player_answers(match_id, player_id);

-- Match scores for leaderboard queries
CREATE INDEX idx_match_scores_match_player ON match_scores(match_id, player_id);

-- Match summaries for analytics
CREATE INDEX idx_match_summaries_winner_id ON match_summaries(winner_id);
CREATE INDEX idx_match_summaries_created_at ON match_summaries(created_at DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate match summary on match completion
CREATE OR REPLACE FUNCTION generate_match_summary()
RETURNS TRIGGER AS $$
DECLARE
    p1_score INTEGER;
    p2_score INTEGER;
    p1_correct INTEGER;
    p2_correct INTEGER;
    p1_total INTEGER;
    p2_total INTEGER;
    p1_avg_time INTEGER;
    p2_avg_time INTEGER;
    total_duration INTEGER;
    winner UUID;
BEGIN
    -- Only generate summary when match finishes
    IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
        -- Calculate player 1 stats
        SELECT 
            COALESCE(SUM(total_points), 0),
            COALESCE(SUM(CASE WHEN pa.is_correct THEN 1 ELSE 0 END), 0),
            COALESCE(COUNT(*), 0),
            COALESCE(AVG(pa.time_taken_ms)::INTEGER, 0)
        INTO p1_score, p1_correct, p1_total, p1_avg_time
        FROM match_scores ms
        LEFT JOIN player_answers pa ON pa.match_id = ms.match_id AND pa.player_id = ms.player_id AND pa.question_id = ms.question_id
        WHERE ms.match_id = NEW.id AND ms.player_id = NEW.player1_id;

        -- Calculate player 2 stats
        SELECT 
            COALESCE(SUM(total_points), 0),
            COALESCE(SUM(CASE WHEN pa.is_correct THEN 1 ELSE 0 END), 0),
            COALESCE(COUNT(*), 0),
            COALESCE(AVG(pa.time_taken_ms)::INTEGER, 0)
        INTO p2_score, p2_correct, p2_total, p2_avg_time
        FROM match_scores ms
        LEFT JOIN player_answers pa ON pa.match_id = ms.match_id AND pa.player_id = ms.player_id AND pa.question_id = ms.question_id
        WHERE ms.match_id = NEW.id AND ms.player_id = NEW.player2_id;

        -- Determine winner (tie-breaker: faster avg time)
        IF p1_score > p2_score THEN
            winner := NEW.player1_id;
        ELSIF p2_score > p1_score THEN
            winner := NEW.player2_id;
        ELSIF p1_avg_time < p2_avg_time THEN
            winner := NEW.player1_id;
        ELSIF p2_avg_time < p1_avg_time THEN
            winner := NEW.player2_id;
        ELSE
            winner := NULL; -- Perfect tie
        END IF;

        -- Calculate total duration
        total_duration := EXTRACT(EPOCH FROM (NEW.finished_at - NEW.started_at))::INTEGER;

        -- Insert summary
        INSERT INTO match_summaries (
            match_id, winner_id, player1_id, player2_id,
            player1_score, player2_score,
            player1_accuracy, player2_accuracy,
            player1_avg_time_ms, player2_avg_time_ms,
            total_duration_seconds
        ) VALUES (
            NEW.id, winner, NEW.player1_id, NEW.player2_id,
            p1_score, p2_score,
            CASE WHEN p1_total > 0 THEN (p1_correct::DECIMAL / p1_total * 100) ELSE 0 END,
            CASE WHEN p2_total > 0 THEN (p2_correct::DECIMAL / p2_total * 100) ELSE 0 END,
            p1_avg_time, p2_avg_time,
            total_duration
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_match_summary_trigger
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION generate_match_summary();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_summaries ENABLE ROW LEVEL SECURITY;

-- Players: Anyone can read, create, and update profiles
CREATE POLICY "Anyone can read players" ON players
    FOR SELECT USING (true);

CREATE POLICY "Anyone can create player" ON players
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update player" ON players
    FOR UPDATE USING (true);

-- Rooms: Public read and create
CREATE POLICY "Anyone can read rooms" ON rooms
    FOR SELECT USING (true);

CREATE POLICY "Anyone can create rooms" ON rooms
    FOR INSERT WITH CHECK (true);

-- Matches: Public read, create, and update
CREATE POLICY "Anyone can read matches" ON matches
    FOR SELECT USING (true);

CREATE POLICY "Anyone can create matches" ON matches
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update matches" ON matches
    FOR UPDATE USING (true);

-- Questions: Public read (needed for game)
CREATE POLICY "Anyone can read questions" ON questions
    FOR SELECT USING (true);

-- Match questions: Public read and insert
CREATE POLICY "Anyone can read match questions" ON match_questions
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert match questions" ON match_questions
    FOR INSERT WITH CHECK (true);

-- Player answers: Public read and insert
CREATE POLICY "Anyone can read player answers" ON player_answers
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert player answers" ON player_answers
    FOR INSERT WITH CHECK (true);

-- Match scores: Public read and insert
CREATE POLICY "Anyone can read match scores" ON match_scores
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert match scores" ON match_scores
    FOR INSERT WITH CHECK (true);

-- Match summaries: Public read (for leaderboards)
CREATE POLICY "Anyone can read match summaries" ON match_summaries
    FOR SELECT USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE players IS 'Player profiles with anonymous auth support';
COMMENT ON TABLE rooms IS 'Game lobbies with 1-hour expiration';
COMMENT ON TABLE matches IS 'Game instances with state management';
COMMENT ON TABLE questions IS 'Question bank with topic/difficulty categorization';
COMMENT ON TABLE match_questions IS 'Junction table with deterministic question ordering';
COMMENT ON TABLE player_answers IS 'Audit trail for anti-cheat validation';
COMMENT ON TABLE match_scores IS 'Real-time score tracking with streak multipliers';
COMMENT ON TABLE match_summaries IS 'Analytics table auto-populated on match completion';

COMMENT ON COLUMN rooms.code IS '6-character alphanumeric room code';
COMMENT ON COLUMN rooms.expires_at IS 'Auto-cleanup after 1 hour';
COMMENT ON COLUMN matches.status IS 'Game state: waiting, active, finished, abandoned';
COMMENT ON COLUMN match_questions.question_order IS 'Deterministic sequence for reconnection safety';
COMMENT ON COLUMN match_scores.streak_multiplier IS 'Capped at 1.3x (3+ correct streak)';
COMMENT ON COLUMN match_summaries.winner_id IS 'Tie-breaker: fastest cumulative time';

-- ============================================================================
-- SUPABASE REALTIME REPLICATION
-- ============================================================================

-- Enable Realtime WebSockets broadcasting for matches and match_scores
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_scores;
