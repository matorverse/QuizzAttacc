import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        const { matchId, playerId, questionId, selectedAnswerIndex, timeTakenMs } = await req.json()

        // Validate inputs
        if (!matchId || !playerId || !questionId) {
            throw new Error('Missing required fields')
        }

        if (selectedAnswerIndex < -1 || selectedAnswerIndex > 3) {
            throw new Error('Invalid answer index')
        }

        const safeTimeTaken = typeof timeTakenMs === 'number' && timeTakenMs >= 0 ? timeTakenMs : 0

        // 1. First attempt: Atomic stored procedure execution
        try {
            const { data: rpcData, error: rpcError } = await supabaseClient.rpc('submit_player_answer', {
                p_match_id: matchId,
                p_player_id: playerId,
                p_question_id: questionId,
                p_selected_answer_index: selectedAnswerIndex,
                p_time_taken_ms: safeTimeTaken,
            })

            if (!rpcError && rpcData && rpcData.success) {
                return new Response(
                    JSON.stringify(rpcData),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    }
                )
            }
        } catch (rpcErr) {
            console.warn('RPC submit_player_answer unavailable, falling back to service_role direct processing:', rpcErr)
        }

        // 2. Direct Fallback using Service Role Key
        const { data: match, error: matchError } = await supabaseClient
            .from('matches')
            .select('*, rooms(*)')
            .eq('id', matchId)
            .single()

        if (matchError || !match) {
            throw new Error('Match not found')
        }

        if (match.status !== 'active') {
            throw new Error('Match is not active')
        }

        if (match.player1_id !== playerId && match.player2_id !== playerId) {
            throw new Error('Player not in this match')
        }

        // Check for duplicate answer
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

        // Get correct answer from database
        const { data: question, error: questionError } = await supabaseClient
            .from('questions')
            .select('correct_answer_index, explanation')
            .eq('id', questionId)
            .single()

        if (questionError || !question) {
            throw new Error('Question not found')
        }

        const isCorrect = selectedAnswerIndex >= 0 && selectedAnswerIndex === question.correct_answer_index
        const timeLimit = (match.rooms?.time_per_question || 15) * 1000

        // Store answer in audit log
        const { error: answerError } = await supabaseClient
            .from('player_answers')
            .insert({
                match_id: matchId,
                player_id: playerId,
                question_id: questionId,
                selected_answer_index: selectedAnswerIndex,
                is_correct: isCorrect,
                time_taken_ms: safeTimeTaken,
                submitted_at: new Date().toISOString(),
            })

        if (answerError) throw answerError

        // Calculate score
        let totalPoints = 0
        let basePoints = 0
        let timeBonus = 0
        let streakMultiplier = 1.0
        let currentStreak = 0

        if (isCorrect) {
            basePoints = 100
            const clampedTime = Math.max(0, Math.min(safeTimeTaken, timeLimit))
            const timeBonusRatio = Math.max(0, (timeLimit - clampedTime) / timeLimit)
            timeBonus = Math.round(timeBonusRatio * 50)

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

            if (currentStreak === 1) streakMultiplier = 1.0
            else if (currentStreak === 2) streakMultiplier = 1.1
            else streakMultiplier = 1.3

            totalPoints = Math.round((basePoints + timeBonus) * streakMultiplier)
        }

        // Store authoritative score
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

        const expectedAnswers = (totalQuestions?.length || 0) * 2
        const actualAnswers = totalAnswers?.length || 0

        let matchComplete = false
        if (actualAnswers >= expectedAnswers) {
            await supabaseClient
                .from('matches')
                .update({
                    status: 'finished',
                    finished_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', matchId)

            matchComplete = true
        }

        return new Response(
            JSON.stringify({
                success: true,
                isCorrect,
                correctAnswerIndex: question.correct_answer_index,
                explanation: question.explanation,
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
    } catch (error: any) {
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
