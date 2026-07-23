import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function decodeEntities(text: string) {
    if (!text) return ''
    return text
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&deg;/g, '°')
        .replace(/&eacute;/g, 'é')
        .replace(/&egrave;/g, 'è')
        .replace(/&aacute;/g, 'á')
        .replace(/&ntilde;/g, 'ñ')
        .replace(/&oacute;/g, 'ó')
        .replace(/&uuml;/g, 'ü')
}

const OPENTDB_CATEGORY_IDS: Record<string, number> = {
    'General Knowledge': 9,
    'Science': 17,
    'History': 23,
    'Pop Culture': 11,
    'Sports': 21,
}

async function fetchAndSaveOpenTDBQuestions(supabaseClient: any, topic: string, difficulty: string, amount: number = 15) {
    const catId = OPENTDB_CATEGORY_IDS[topic] || 9
    const url = `https://opentdb.com/api.php?amount=${amount}&category=${catId}&difficulty=${difficulty}&type=multiple`
    try {
        const res = await fetch(url)
        if (!res.ok) return []
        const data = await res.json()
        if (data.response_code !== 0 || !data.results) return []

        const newQuestions = []
        for (const item of data.results) {
            const qText = decodeEntities(item.question).trim()
            const correctAns = decodeEntities(item.correct_answer).trim()
            const incorrects = item.incorrect_answers.map((a: string) => decodeEntities(a).trim())

            const options = [correctAns, ...incorrects]
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[options[i], options[j]] = [options[j], options[i]]
            }

            const correctIndex = options.indexOf(correctAns)

            newQuestions.push({
                topic,
                difficulty,
                question_text: qText,
                options,
                correct_answer_index: correctIndex,
                explanation: `${correctAns} is the correct answer.`,
            })
        }

        if (newQuestions.length > 0) {
            const { data: inserted, error } = await supabaseClient
                .from('questions')
                .insert(newQuestions)
                .select('id')

            if (!error && inserted) {
                return inserted
            }
        }
    } catch (e) {
        console.error('Failed to fetch from OpenTDB:', e)
    }
    return []
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        )

        const { displayName, roomCode } = await req.json()

        if (!displayName || displayName.length < 2 || displayName.length > 30) {
            throw new Error('Display name must be 2-30 characters')
        }

        if (!roomCode || roomCode.length !== 6) {
            throw new Error('Room code must be 6 characters')
        }

        const normalizedCode = roomCode.toUpperCase()

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

        const { data: room, error: roomError } = await supabaseClient
            .from('rooms')
            .select('*')
            .eq('code', normalizedCode)
            .single()

        if (roomError || !room) {
            throw new Error('Room not found')
        }

        if (new Date(room.expires_at) < new Date()) {
            throw new Error('Room has expired')
        }

        const { data: match, error: matchError } = await supabaseClient
            .from('matches')
            .select('*')
            .eq('room_id', room.id)
            .single()

        if (matchError || !match) {
            throw new Error('Match not found')
        }

        if (match.status !== 'waiting') {
            throw new Error(`Cannot join: match is ${match.status}`)
        }

        if (match.player2_id) {
            throw new Error('Room is full')
        }

        if (match.player1_id === playerId) {
            throw new Error('You are already in this room as host')
        }

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

        // Resolve Question Pool with multi-tier fallback + OpenTDB dynamic fetch
        const { data: exactQuestions } = await supabaseClient
            .from('questions')
            .select('id')
            .eq('topic', room.topic)
            .eq('difficulty', room.difficulty)

        let pool = exactQuestions || []

        // Dynamic OpenTDB Fetch if exact match is insufficient
        if (pool.length < room.question_count) {
            const fetched = await fetchAndSaveOpenTDBQuestions(supabaseClient, room.topic, room.difficulty, 15)
            if (fetched && fetched.length > 0) {
                const existingIds = new Set(pool.map((q) => q.id))
                const newItems = fetched.filter((q: any) => !existingIds.has(q.id))
                pool = [...pool, ...newItems]
            }
        }

        // Fallback 2: Same topic
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

        // Fallback 3: Any question in database
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
            throw new Error(`Not enough questions available (required ${room.question_count}, found ${pool.length})`)
        }

        // Fisher-Yates Shuffle
        const shuffled = [...pool]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }

        const selectedQuestions = shuffled.slice(0, room.question_count)

        const matchQuestions = selectedQuestions.map((q, index) => ({
            match_id: match.id,
            question_id: q.id,
            question_order: index + 1,
            started_at: index === 0 ? new Date().toISOString() : null,
        }))

        const { error: insertQuestionsError } = await supabaseClient
            .from('match_questions')
            .insert(matchQuestions)

        if (insertQuestionsError) throw insertQuestionsError

        const { data: firstQuestion, error: firstQuestionError } = await supabaseClient
            .from('questions')
            .select('*')
            .eq('id', selectedQuestions[0].id)
            .single()

        if (firstQuestionError) throw firstQuestionError

        const { data: player1Data } = await supabaseClient
            .from('players')
            .select('id, display_name')
            .eq('id', match.player1_id)
            .single()

        return new Response(
            JSON.stringify({
                success: true,
                matchId: match.id,
                playerId: playerId,
                opponent: {
                    id: match.player1_id,
                    displayName: player1Data?.display_name || 'Host',
                },
                roomSettings: {
                    topic: room.topic,
                    difficulty: room.difficulty,
                    questionCount: room.question_count,
                    timePerQuestion: room.time_per_question,
                },
                firstQuestion: firstQuestion,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
