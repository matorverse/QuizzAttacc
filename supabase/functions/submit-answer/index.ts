import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Latency compensation buffer (200ms grace period)
const LATENCY_BUFFER_MS = 200

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Use service role key for server-authoritative operations
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        const { matchId, playerId, questionId, selectedAnswerIndex, timeTakenMs, submittedAt } = await req.json()

        // Validate inputs
        if (!matchId || !playerId || !questionId) {
            throw new Error('Missing required fields')
        }

        if (selectedAnswerIndex < 0 || selectedAnswerIndex > 3) {
            throw new Error('Invalid answer index')
        }

        if (timeTakenMs < 0) {
            throw new Error('Invalid time taken')
        }

        // Get match details
        const { data: match, error: matchError } = await supabaseClient
            .from('matches')
            .select('*, rooms(*)')
            .eq('id', matchId)
            .single()

        if (matchError || !match) {
            throw new Error('Match not found')
        }

        // Verify match is active
        if (match.status !== 'active') {
            throw new Error('Match is not active')
        }

        // Verify player is in this match
        if (match.player1_id !== playerId && match.player2_id !== playerId) {
            throw new Error('Player not in this match')
        }

        // Get match question details
        const { data: matchQuestion, error: mqError } = await supabaseClient
            .from('match_questions')
            .select('*')
            .eq('match_id', matchId)
            .eq('question_id', questionId)
            .single()

        if (mqError || !matchQuestion) {
            throw new Error('Question not found in this match')
        }

        // Time validation with latency buffer
        const questionStartTime = new Date(matchQuestion.started_at || match.started_at).getTime()
        const timeLimit = match.rooms.time_per_question * 1000 // Convert to ms
        const deadline = questionStartTime + timeLimit + LATENCY_BUFFER_MS
        const submissionTime = new Date(submittedAt).getTime()

        if (submissionTime > deadline) {
            throw new Error('Answer submitted too late')
        }

        // Check for duplicate answer (anti-cheat)
        const { data: existingAnswer } = await supabaseClient
            .from('player_answers')
            .select('id')
            .eq('match_id', matchId)
            .eq('player_id', playerId)
            .eq('question_id', questionId)
            .single()

        if (existingAnswer) {
            throw new Error('Answer already submitted for this question')
        }

        // Get correct answer
        const { data: question, error: questionError } = await supabaseClient
            .from('questions')
            .select('correct_answer_index')
            .eq('id', questionId)
            .single()

        if (questionError || !question) {
            throw new Error('Question not found')
        }

        const isCorrect = selectedAnswerIndex === question.correct_answer_index

        // Store answer in audit log
        const { error: answerError } = await supabaseClient
            .from('player_answers')
            .insert({
                match_id: matchId,
                player_id: playerId,
                question_id: questionId,
                selected_answer_index: selectedAnswerIndex,
                is_correct: isCorrect,
                time_taken_ms: timeTakenMs,
                submitted_at: submittedAt,
            })

        if (answerError) throw answerError

        // Calculate score if correct
        let totalPoints = 0
        let basePoints = 0
        let timeBonus = 0
        let streakMultiplier = 1.0
        let currentStreak = 0

        if (isCorrect) {
            basePoints = 100

            // Time bonus: Linear decay from 50 to 0
            const timeLimitMs = timeLimit
            const timeBonusRatio = Math.max(0, (timeLimitMs - timeTakenMs) / timeLimitMs)
            timeBonus = Math.round(timeBonusRatio * 50)

            // Get current streak
            const { data: previousScores } = await supabaseClient
                .from('match_scores')
                .select('current_streak')
                .eq('match_id', matchId)
                .eq('player_id', playerId)
                .order('created_at', { ascending: false })
                .limit(1)

            if (previousScores && previousScores.length > 0) {
                currentStreak = previousScores[0].current_streak + 1
            } else {
                currentStreak = 1
            }

            // Streak multiplier
            if (currentStreak === 1) {
                streakMultiplier = 1.0
            } else if (currentStreak === 2) {
                streakMultiplier = 1.1
            } else {
                streakMultiplier = 1.3 // Capped at 3+
            }

            totalPoints = Math.round((basePoints + timeBonus) * streakMultiplier)
        } else {
            // Reset streak on incorrect answer
            currentStreak = 0
        }

        // Store score
        const { error: scoreError } = await supabaseClient
            .from('match_scores')
            .insert({
                match_id: matchId,
                player_id: playerId,
                question_id: questionId,
                base_points: basePoints,
                time_bonus: timeBonus,
                streak_multiplier: streakMultiplier,
                total_points: totalPoints,
                current_streak: currentStreak,
            })

        if (scoreError) throw scoreError

        // Check if all questions answered by both players
        const { data: totalQuestions } = await supabaseClient
            .from('match_questions')
            .select('id')
            .eq('match_id', matchId)

        const { data: totalAnswers } = await supabaseClient
            .from('player_answers')
            .select('id')
            .eq('match_id', matchId)

        const expectedAnswers = (totalQuestions?.length || 0) * 2 // Both players
        const actualAnswers = totalAnswers?.length || 0

        let matchComplete = false

        if (actualAnswers >= expectedAnswers) {
            // Mark match as finished
            await supabaseClient
                .from('matches')
                .update({
                    status: 'finished',
                    finished_at: new Date().toISOString(),
                })
                .eq('id', matchId)

            matchComplete = true
        }

        // Update next question's started_at if exists
        if (!matchComplete) {
            const nextOrder = matchQuestion.question_order + 1
            await supabaseClient
                .from('match_questions')
                .update({ started_at: new Date().toISOString() })
                .eq('match_id', matchId)
                .eq('question_order', nextOrder)
                .is('started_at', null)
        }

        return new Response(
            JSON.stringify({
                success: true,
                isCorrect,
                correctAnswerIndex: question.correct_answer_index,
                score: {
                    basePoints,
                    timeBonus,
                    streakMultiplier,
                    totalPoints,
                    currentStreak,
                },
                matchComplete,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Submit answer error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
