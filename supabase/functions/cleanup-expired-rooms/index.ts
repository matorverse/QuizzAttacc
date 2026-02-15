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
        // Use service role key for cleanup operations
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        const now = new Date().toISOString()
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

        let deletedRooms = 0
        let abandonedWaiting = 0
        let abandonedActive = 0

        // Delete expired rooms (CASCADE will handle related data)
        const { data: expiredRooms, error: deleteError } = await supabaseClient
            .from('rooms')
            .delete()
            .lt('expires_at', now)
            .select('id')

        if (deleteError) {
            console.error('Error deleting expired rooms:', deleteError)
        } else {
            deletedRooms = expiredRooms?.length || 0
        }

        // Mark waiting matches as abandoned if no guest joined within 30 minutes
        const { data: waitingMatches, error: waitingError } = await supabaseClient
            .from('matches')
            .update({ status: 'abandoned' })
            .eq('status', 'waiting')
            .lt('created_at', thirtyMinutesAgo)
            .is('player2_id', null)
            .select('id')

        if (waitingError) {
            console.error('Error marking waiting matches as abandoned:', waitingError)
        } else {
            abandonedWaiting = waitingMatches?.length || 0
        }

        // Mark active matches as abandoned if no activity for 2 hours
        // Check for matches where the last answer was submitted more than 2 hours ago
        const { data: activeMatches, error: activeError } = await supabaseClient
            .from('matches')
            .select('id, (player_answers(submitted_at))')
            .eq('status', 'active')

        if (!activeError && activeMatches) {
            for (const match of activeMatches) {
                // @ts-ignore - Supabase typing issue
                const answers = match.player_answers || []

                if (answers.length === 0) {
                    // No answers yet, check match start time
                    const { data: matchData } = await supabaseClient
                        .from('matches')
                        .select('started_at')
                        .eq('id', match.id)
                        .single()

                    if (matchData && matchData.started_at < twoHoursAgo) {
                        await supabaseClient
                            .from('matches')
                            .update({ status: 'abandoned' })
                            .eq('id', match.id)
                        abandonedActive++
                    }
                } else {
                    // Check last answer time
                    const lastAnswerTime = answers.reduce((latest: string, answer: any) => {
                        return answer.submitted_at > latest ? answer.submitted_at : latest
                    }, answers[0].submitted_at)

                    if (lastAnswerTime < twoHoursAgo) {
                        await supabaseClient
                            .from('matches')
                            .update({ status: 'abandoned' })
                            .eq('id', match.id)
                        abandonedActive++
                    }
                }
            }
        }

        const summary = {
            success: true,
            timestamp: now,
            deletedRooms,
            abandonedWaiting,
            abandonedActive,
            totalCleaned: deletedRooms + abandonedWaiting + abandonedActive,
        }

        console.log('Cleanup completed:', summary)

        return new Response(
            JSON.stringify(summary),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Cleanup error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})
