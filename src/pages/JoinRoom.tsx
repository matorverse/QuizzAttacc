import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatRoomCode, parseRoomCode, saveGameState } from '../lib/gameLogic'

export default function JoinRoom() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        displayName: '',
        roomCode: '',
    })

    const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatRoomCode(e.target.value)
        setFormData({ ...formData, roomCode: formatted })
    }

    const joinRoomDirectly = async (cleanCode: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        let playerId: string
        if (user) {
            const { data: existingPlayer } = await supabase.from('players').select('id').eq('auth_id', user.id).single()
            if (existingPlayer) {
                playerId = existingPlayer.id
                await supabase.from('players').update({ display_name: formData.displayName }).eq('id', playerId)
            } else {
                const { data: newP, error: pErr } = await supabase.from('players').insert({ display_name: formData.displayName, auth_id: user.id }).select('id').single()
                if (pErr) throw pErr
                playerId = newP.id
            }
        } else {
            const { data: newP, error: pErr } = await supabase.from('players').insert({ display_name: formData.displayName }).select('id').single()
            if (pErr) throw pErr
            playerId = newP.id
        }

        const { data: room, error: roomErr } = await supabase.from('rooms').select('*').eq('code', cleanCode).single()
        if (roomErr || !room) throw new Error('Room not found')

        if (new Date(room.expires_at) < new Date()) {
            throw new Error('Room has expired')
        }

        const { data: match, error: matchErr } = await supabase.from('matches').select('*').eq('room_id', room.id).single()
        if (matchErr || !match) throw new Error('Match not found')
        if (match.status !== 'waiting') throw new Error(`Cannot join: match is ${match.status}`)
        if (match.player2_id) throw new Error('Room is full')
        if (match.player1_id === playerId) throw new Error('You are already the host of this room')

        // Attempt RPC call first for ultra-fast atomic execution
        try {
            const { data: rpcResult, error: rpcErr } = await supabase.rpc('join_and_setup_match', {
                p_match_id: match.id,
                p_player2_id: playerId,
            })
            if (!rpcErr && rpcResult && rpcResult.success) {
                return rpcResult
            }
        } catch {
            // Fallback to client multi-query approach if RPC is not deployed
        }

        await supabase.from('matches').update({
            player2_id: playerId,
            status: 'active',
            started_at: new Date().toISOString(),
        }).eq('id', match.id)

        // Select question pool
        const { data: exactQuestions } = await supabase.from('questions').select('id').eq('topic', room.topic).eq('difficulty', room.difficulty)
        let pool = exactQuestions || []

        if (pool.length < room.question_count) {
            const { data: topicQuestions } = await supabase.from('questions').select('id').eq('topic', room.topic)
            if (topicQuestions && topicQuestions.length > 0) {
                const existingIds = new Set(pool.map((q) => q.id))
                const extra = topicQuestions.filter((q) => !existingIds.has(q.id))
                pool = [...pool, ...extra]
            }
        }

        if (pool.length < room.question_count) {
            const { data: allQuestions } = await supabase.from('questions').select('id')
            if (allQuestions && allQuestions.length > 0) {
                const existingIds = new Set(pool.map((q) => q.id))
                const extra = allQuestions.filter((q) => !existingIds.has(q.id))
                pool = [...pool, ...extra]
            }
        }

        if (pool.length < room.question_count) {
            throw new Error(`Not enough questions available (required ${room.question_count}, found ${pool.length})`)
        }

        const shuffled = [...pool]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        const selected = shuffled.slice(0, room.question_count)

        const matchQuestions = selected.map((q, index) => ({
            match_id: match.id,
            question_id: q.id,
            question_order: index + 1,
            started_at: index === 0 ? new Date().toISOString() : null,
        }))

        await supabase.from('match_questions').insert(matchQuestions)

        const { data: hostPlayer } = await supabase.from('players').select('display_name').eq('id', match.player1_id).single()

        return {
            success: true,
            matchId: match.id,
            playerId,
            opponent: {
                id: match.player1_id,
                displayName: hostPlayer?.display_name || 'Host',
            },
            roomSettings: {
                topic: room.topic,
                difficulty: room.difficulty,
                questionCount: room.question_count,
                timePerQuestion: room.time_per_question,
            }
        }
    }

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            try {
                await supabase.auth.signInAnonymously()
            } catch (e) {
                console.warn('Auth fallback active')
            }

            const cleanCode = parseRoomCode(formData.roomCode)
            let result: any = null

            try {
                const { data, error: functionError } = await supabase.functions.invoke('join-room', {
                    body: {
                        displayName: formData.displayName,
                        roomCode: cleanCode,
                    },
                })

                if (functionError || !data?.success) {
                    console.warn('Edge function invoke fallback, using direct client DB:', functionError?.message || data?.error)
                    result = await joinRoomDirectly(cleanCode)
                } else {
                    result = data
                }
            } catch (edgeErr) {
                console.warn('Edge Function unavailable, joining room directly via DB:', edgeErr)
                result = await joinRoomDirectly(cleanCode)
            }

            if (!result || !result.success) throw new Error('Failed to join room')

            // Send instant Realtime broadcast signal so host navigates immediately without waiting for DB CDC
            try {
                const bChannel = supabase.channel(`match:${result.matchId}`)
                bChannel.subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        bChannel.send({
                            type: 'broadcast',
                            event: 'PLAYER_JOINED',
                            payload: { matchId: result.matchId },
                        })
                    }
                })
            } catch {
                // Ignore broadcast error fallback
            }

            saveGameState({
                matchId: result.matchId,
                playerId: result.playerId,
                opponentId: result.opponent.id,
                currentQuestionOrder: 1,
                totalQuestions: result.roomSettings.questionCount,
                timePerQuestion: result.roomSettings.timePerQuestion,
                topic: result.roomSettings.topic,
                difficulty: result.roomSettings.difficulty,
            })

            navigate(`/game/${result.matchId}`)
        } catch (err: any) {
            setError(err.message || 'Failed to join room')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <button
                    onClick={() => navigate('/')}
                    className="mb-4 text-parchment-muted hover:text-gold transition-colors flex items-center gap-2 font-serif text-sm"
                >
                    ← Back to Hall
                </button>

                <div className="card-parchment">
                    <h2 className="text-3xl font-serif font-bold mb-6 text-parchment-text border-b border-parchment-border pb-3">
                        Join a Duel
                    </h2>

                    <form onSubmit={handleJoin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-serif font-bold text-parchment-text mb-2">Your Display Name</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter display name"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                minLength={2}
                                maxLength={30}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-serif font-bold text-parchment-text mb-2">6-Character Table Code</label>
                            <input
                                type="text"
                                className="input text-center text-3xl font-serif font-bold tracking-widest text-wood-dark"
                                placeholder="XXX-XXX"
                                value={formData.roomCode}
                                onChange={handleRoomCodeChange}
                                maxLength={7}
                                required
                            />
                            <p className="text-xs text-parchment-muted font-serif mt-1.5">Enter the code provided by the table host</p>
                        </div>

                        {error && (
                            <div className="bg-burgundy/10 border border-burgundy/40 text-burgundy p-3 rounded-xl text-xs font-serif">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary w-full" disabled={loading}>
                            {loading ? 'Entering Table...' : 'Enter Duel'}
                        </button>
                    </form>

                    <div className="mt-6 bg-wood-dark/90 p-4 rounded-xl text-gold border border-gold/30">
                        <p className="text-xs font-serif text-center">
                            💡 <span className="font-bold text-gold-light">Tavern Rule:</span> The quiz battle begins immediately upon entering the table!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
