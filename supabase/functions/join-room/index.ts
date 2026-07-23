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
        // Use service role key for game lobby administration
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        )

        const { displayName, roomCode } = await req.json()

        // Validate inputs
        if (!displayName || displayName.length < 2 || displayName.length > 30) {
            throw new Error('Display name must be 2-30 characters')
        }

        if (!roomCode || roomCode.length !== 6) {
            throw new Error('Room code must be 6 characters')
        }

        const normalizedCode = roomCode.toUpperCase()

        // Get or create player
        const { data: { user } } = await supabaseClient.auth.getUser()

        let playerId: string

        if (user) {
            const { data: existingPlayer } = await supabaseClient
                .from('players')
                .select('id')
                .eq('auth_id', user.id)
                .single()

            if (existingPlayer) {
                playerId = existingPlayer.id
                await supabaseClient
                    .from('players')
                    .update({ display_name: displayName })
                    .eq('id', playerId)
            } else {
                const { data: newPlayer, error: playerError } = await supabaseClient
                    .from('players')
                    .insert({ display_name: displayName, auth_id: user.id })
                    .select()
                    .single()

                if (playerError) throw playerError
                playerId = newPlayer.id
            }
        } else {
            const { data: newPlayer, error: playerError } = await supabaseClient
                .from('players')
                .insert({ display_name: displayName })
                .select()
                .single()

            if (playerError) throw playerError
            playerId = newPlayer.id
        }

        // Find room by code
        const { data: room, error: roomError } = await supabaseClient
            .from('rooms')
            .select('*')
            .eq('code', normalizedCode)
            .single()

        if (roomError || !room) {
            throw new Error('Room not found')
        }

        // Check if room expired
        if (new Date(room.expires_at) < new Date()) {
            throw new Error('Room has expired')
        }

        // Get match for this room
        const { data: match, error: matchError } = await supabaseClient
            .from('matches')
            .select('*')
            .eq('room_id', room.id)
            .single()

        if (matchError || !match) {
            throw new Error('Match not found')
        }

        // Validate match status
        if (match.status !== 'waiting') {
            throw new Error(`Cannot join: match is ${match.status}`)
        }

        // Check if room is full
        if (match.player2_id) {
            throw new Error('Room is full')
        }

        // Prevent host from joining as guest
        if (match.player1_id === playerId) {
            throw new Error('You are already in this room as host')
        }

        // Add player2 to match and update status to 'active'
        const { data: updatedMatch, error: updateError } = await supabaseClient
            .from('matches')
            .update({
                player2_id: playerId,
                status: 'active',
                started_at: new Date().toISOString(),
            })
            .eq('id', match.id)
            .select()
            .single()

        if (updateError) throw updateError

        // Select questions based on room topic and difficulty, with fallback
        const { data: exactQuestions, error: questionsError } = await supabaseClient
            .from('questions')
            .select('id')
            .eq('topic', room.topic)
            .eq('difficulty', room.difficulty)

        if (questionsError) throw questionsError

        let pool = exactQuestions || []

        // Fallback: If not enough exact difficulty matches, pull remaining from same topic
        if (pool.length < room.question_count) {
            const { data: topicQuestions } = await supabaseClient
                .from('questions')
                .select('id')
                .eq('topic', room.topic)

            if (topicQuestions && topicQuestions.length > 0) {
                const existingIds = new Set(pool.map((q) => q.id))
                const extraQuestions = topicQuestions.filter((q) => !existingIds.has(q.id))
                pool = [...pool, ...extraQuestions]
            }
        }

        // Final fallback: If still not enough, pull from any topic
        if (pool.length < room.question_count) {
            const { data: allQuestions } = await supabaseClient
                .from('questions')
                .select('id')

            if (allQuestions && allQuestions.length > 0) {
                const existingIds = new Set(pool.map((q) => q.id))
                const extraQuestions = allQuestions.filter((q) => !existingIds.has(q.id))
                pool = [...pool, ...extraQuestions]
            }
        }

        if (pool.length < room.question_count) {
            throw new Error(`Not enough questions available in database (required ${room.question_count}, found ${pool.length})`)
        }

        // Fisher-Yates Shuffle for uniform random ordering
        const shuffled = [...pool]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        const selectedQuestions = shuffled.slice(0, room.question_count)

        // Insert match_questions with deterministic order
        const matchQuestions = selectedQuestions.map((q, index) => ({
            match_id: match.id,
            question_id: q.id,
            question_order: index + 1,
            started_at: index === 0 ? new Date().toISOString() : null, // Start first question immediately
        }))

        const { error: insertQuestionsError } = await supabaseClient
            .from('match_questions')
            .insert(matchQuestions)

        if (insertQuestionsError) throw insertQuestionsError

        // Get first question details
        const { data: firstQuestion, error: firstQuestionError } = await supabaseClient
            .from('questions')
            .select('*')
            .eq('id', selectedQuestions[0].id)
            .single()

        if (firstQuestionError) throw firstQuestionError

        return new Response(
            JSON.stringify({
                success: true,
                matchId: match.id,
                playerId,
                roomSettings: {
                    topic: room.topic,
                    difficulty: room.difficulty,
                    questionCount: room.question_count,
                    timePerQuestion: room.time_per_question,
                },
                firstQuestion: {
                    id: firstQuestion.id,
                    questionText: firstQuestion.question_text,
                    options: firstQuestion.options,
                    order: 1,
                    totalQuestions: room.question_count,
                },
                opponent: {
                    id: match.player1_id,
                },
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
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
