import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { displayName, topic, difficulty, questionCount, timePerQuestion } = await req.json()

    // Validate inputs
    if (!displayName || displayName.length < 2 || displayName.length > 30) {
      throw new Error('Display name must be 2-30 characters')
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw new Error('Invalid difficulty level')
    }

    if (![5, 10, 15].includes(questionCount)) {
      throw new Error('Question count must be 5, 10, or 15')
    }

    if (![10, 15, 20, 30].includes(timePerQuestion)) {
      throw new Error('Time per question must be 10, 15, 20, or 30 seconds')
    }

    // Resolve Auth User from request Authorization Bearer header
    const authHeader = req.headers.get('Authorization')
    let user = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim()
      if (token) {
        const { data: userData } = await supabaseClient.auth.getUser(token)
        user = userData?.user || null
      }
    }

    let playerId: string

    if (user) {
      const { data: existingPlayer } = await supabaseClient
        .from('players')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle()

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
          .select('id')
          .single()

        if (playerError) throw playerError
        playerId = newPlayer.id
      }
    } else {
      const { data: newPlayer, error: playerError } = await supabaseClient
        .from('players')
        .insert({ display_name: displayName })
        .select('id')
        .single()

      if (playerError) throw playerError
      playerId = newPlayer.id
    }

    // Rate limiting: Check if player created too many rooms recently
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentRooms, error: rateLimitError } = await supabaseClient
      .from('rooms')
      .select('id')
      .eq('host_id', playerId)
      .gte('created_at', oneHourAgo)

    if (rateLimitError) throw rateLimitError

    if (recentRooms && recentRooms.length >= 10) {
      throw new Error('Rate limit exceeded: Maximum 10 rooms hosted per hour')
    }

    // Generate unique 6-character room code
    let roomCode = ''
    let codeExists = true
    let attempts = 0
    const maxAttempts = 10

    while (codeExists && attempts < maxAttempts) {
      roomCode = generateRoomCode()
      const { data: existingRoom } = await supabaseClient
        .from('rooms')
        .select('id')
        .eq('code', roomCode)
        .maybeSingle()

      codeExists = !!existingRoom
      attempts++
    }

    if (codeExists || !roomCode) {
      throw new Error('Failed to generate unique room code')
    }

    // Create room
    const { data: room, error: roomError } = await supabaseClient
      .from('rooms')
      .insert({
        code: roomCode,
        host_id: playerId,
        topic,
        difficulty,
        question_count: questionCount,
        time_per_question: timePerQuestion,
      })
      .select('*')
      .single()

    if (roomError) throw roomError

    // Create match with status 'waiting'
    const { data: match, error: matchError } = await supabaseClient
      .from('matches')
      .insert({
        room_id: room.id,
        player1_id: playerId,
        status: 'waiting',
      })
      .select('*')
      .single()

    if (matchError) throw matchError

    return new Response(
      JSON.stringify({
        success: true,
        roomCode: room.code,
        matchId: match.id,
        playerId,
        roomSettings: {
          topic,
          difficulty,
          questionCount,
          timePerQuestion,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
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

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
