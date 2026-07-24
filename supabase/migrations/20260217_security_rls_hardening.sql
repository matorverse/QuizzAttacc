-- Row Level Security (RLS) Security Hardening
-- Ensures player answers and scores can only be created by legitimate match participants

-- Drop existing generic policies on player_answers
DROP POLICY IF EXISTS "Anyone can insert player answers" ON player_answers;

-- Create scoped insert policy for player answers
CREATE POLICY "Match players can insert answers" ON player_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = player_answers.match_id
            AND m.status = 'active'
            AND (m.player1_id = player_answers.player_id OR m.player2_id = player_answers.player_id)
        )
    );

-- Drop existing generic policies on match_scores
DROP POLICY IF EXISTS "Anyone can insert match scores" ON match_scores;

-- Create scoped insert policy for match scores
CREATE POLICY "Match players can insert scores" ON match_scores
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = match_scores.match_id
            AND (m.player1_id = match_scores.player_id OR m.player2_id = match_scores.player_id)
        )
    );
