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

        // 1. Try atomic database stored procedure first (<10ms single roundtrip)
        try {
            const { data: rpcSummary, error: rpcErr } = await supabaseClient.rpc('cleanup_stale_rooms_and_matches')
            if (!rpcErr && rpcSummary) {
                return new Response(
                    JSON.stringify(rpcSummary),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    }
                )
            }
        } catch (rpcErr) {
            console.warn('RPC cleanup_stale_rooms_and_matches unavailable, running direct set-based queries:', rpcErr)
        }

        // 2. Set-based Fallback (No N+1 queries)
        const now = new Date().toISOString()
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

        // Delete expired rooms (CASCADE handles dependent records)
        const { data: expiredRooms } = await supabaseClient
            .from('rooms')
            .delete()
            .lt('expires_at', now)
            .select('id')

        const deletedRooms = expiredRooms?.length || 0

        // Mark waiting matches abandoned if no guest after 30 mins
        const { data: waitingMatches } = await supabaseClient
            .from('matches')
            .update({ status: 'abandoned', updated_at: now })
            .eq('status', 'waiting')
            .lt('created_at', thirtyMinutesAgo)
            .is('player2_id', null)
            .select('id')

        const abandonedWaiting = waitingMatches?.length || 0

        // Mark stale active matches abandoned if no answers recently
        const { data: staleMatches } = await supabaseClient
            .from('matches')
            .update({ status: 'abandoned', updated_at: now })
            .eq('status', 'active')
            .lt('started_at', twoHoursAgo)
            .select('id')

        const abandonedActive = staleMatches?.length || 0

        const summary = {
            success: true,
            timestamp: now,
            deletedRooms,
            abandonedWaiting,
            abandonedActive,
            totalCleaned: deletedRooms + abandonedWaiting + abandonedActive,
        }

        return new Response(
            JSON.stringify(summary),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error: any) {
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
