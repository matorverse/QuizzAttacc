import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { saveGameState } from '../lib/gameLogic'

const TOPICS = ['General Knowledge', 'Science', 'History', 'Pop Culture', 'Sports']
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
const QUESTION_COUNTS = [5, 10, 15]
const TIME_OPTIONS = [10, 15, 20, 30]

export default function CreateRoom() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [roomCode, setRoomCode] = useState('')
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    const [formData, setFormData] = useState({
        displayName: '',
        topic: TOPICS[0],
        difficulty: 'medium' as typeof DIFFICULTIES[number],
        questionCount: 10,
        timePerQuestion: 15,
    })

    useEffect(() => {
        return () => {
            if (channelRef.current) {
                channelRef.current.unsubscribe()
                channelRef.current = null
            }
        }
    }, [])

    const createRoomDirectly = async () => {
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

        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }

        const { data: room, error: roomErr } = await supabase.from('rooms').insert({
            code,
            host_id: playerId,
            topic: formData.topic,
            difficulty: formData.difficulty,
            question_count: formData.questionCount,
            time_per_question: formData.timePerQuestion,
        }).select('*').single()

        if (roomErr) throw roomErr

        const { data: match, error: matchErr } = await supabase.from('matches').insert({
            room_id: room.id,
            player1_id: playerId,
            status: 'waiting',
        }).select('*').single()

        if (matchErr) throw matchErr

        return {
            success: true,
            roomCode: code,
            matchId: match.id,
            playerId,
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            try {
                await supabase.auth.signInAnonymously()
            } catch (e) {
                console.warn('Auth fallback active')
            }

            let result: any = null

            try {
                const { data, error: functionError } = await supabase.functions.invoke('create-room', {
                    body: formData,
                })

                if (functionError || !data?.success) {
                    console.warn('Edge function invoke fallback, using direct client DB:', functionError?.message || data?.error)
                    result = await createRoomDirectly()
                } else {
                    result = data
                }
            } catch (edgeErr) {
                console.warn('Edge Function unavailable, creating room directly via DB:', edgeErr)
                result = await createRoomDirectly()
            }

            if (!result || !result.success) throw new Error('Failed to create room')

            setRoomCode(result.roomCode)

            saveGameState({
                matchId: result.matchId,
                playerId: result.playerId,
                opponentId: '',
                currentQuestionOrder: 1,
                totalQuestions: formData.questionCount,
                timePerQuestion: formData.timePerQuestion,
                topic: formData.topic,
                difficulty: formData.difficulty,
            })

            const channel = supabase
                .channel(`match:${result.matchId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'matches',
                        filter: `id=eq.${result.matchId}`,
                    },
                    (payload) => {
                        if (payload.new.status === 'active') {
                            navigate(`/game/${result.matchId}`)
                        }
                    }
                )
                .subscribe()

            channelRef.current = channel
        } catch (err: any) {
            setError(err.message || 'Failed to create room')
            setLoading(false)
        }
    }

    const copyRoomCode = () => {
        navigator.clipboard.writeText(roomCode)
    }

    const shareRoom = async () => {
        if (typeof navigator.share === 'function') {
            try {
                await navigator.share({
                    title: 'Join my QuizzAttacc battle!',
                    text: `Room code: ${roomCode}`,
                    url: window.location.origin,
                })
            } catch (err) {
                console.warn('Share cancelled', err)
            }
        } else {
            copyRoomCode()
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
                        Host a Table
                    </h2>

                    {!roomCode ? (
                        <form onSubmit={handleCreate} className="space-y-5">
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
                                <label className="block text-sm font-serif font-bold text-parchment-text mb-2">Trivia Topic</label>
                                <select
                                    className="input"
                                    value={formData.topic}
                                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                >
                                    {TOPICS.map((topic) => (
                                        <option key={topic} value={topic}>
                                            {topic}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-serif font-bold text-parchment-text mb-2">Difficulty</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {DIFFICULTIES.map((diff) => (
                                        <button
                                            key={diff}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, difficulty: diff })}
                                            className={`py-2 px-3 rounded-xl border text-xs font-serif font-bold capitalize transition-all ${formData.difficulty === diff
                                                    ? 'bg-wood-medium text-gold border-gold shadow-sm'
                                                    : 'bg-parchment-dark/40 text-parchment-text border-parchment-border hover:bg-parchment'
                                                }`}
                                        >
                                            {diff}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-serif font-bold text-parchment-text mb-2">Number of Questions</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {QUESTION_COUNTS.map((count) => (
                                        <button
                                            key={count}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, questionCount: count })}
                                            className={`py-2 px-3 rounded-xl border text-xs font-serif font-bold transition-all ${formData.questionCount === count
                                                    ? 'bg-wood-medium text-gold border-gold shadow-sm'
                                                    : 'bg-parchment-dark/40 text-parchment-text border-parchment-border hover:bg-parchment'
                                                }`}
                                        >
                                            {count} Questions
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-serif font-bold text-parchment-text mb-2">Time per Question</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {TIME_OPTIONS.map((time) => (
                                        <button
                                            key={time}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, timePerQuestion: time })}
                                            className={`py-2 px-3 rounded-xl border text-xs font-serif font-bold transition-all ${formData.timePerQuestion === time
                                                    ? 'bg-wood-medium text-gold border-gold shadow-sm'
                                                    : 'bg-parchment-dark/40 text-parchment-text border-parchment-border hover:bg-parchment'
                                                }`}
                                        >
                                            {time}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="bg-burgundy/10 border border-burgundy/40 text-burgundy p-3 rounded-xl text-xs font-serif">
                                    {error}
                                </div>
                            )}

                            <button type="submit" className="btn-primary w-full" disabled={loading}>
                                {loading ? 'Preparing Table...' : 'CREATE TABLE'}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6 text-center animate-scale-in">
                            <div className="text-4xl mb-2">📜</div>
                            <h3 className="text-xl font-serif font-bold text-parchment-text">Table Code Generated!</h3>
                            <p className="text-sm font-serif text-parchment-muted">
                                Share this code with your opponent to begin the duel:
                            </p>

                            <div className="wood-panel p-6 rounded-2xl border-2 border-gold/60 my-4 shadow-xl">
                                <div className="text-4xl font-serif font-bold tracking-widest text-gold-gradient select-all">
                                    {roomCode}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={copyRoomCode} className="btn-secondary flex-1 text-sm">
                                    📋 Copy Code
                                </button>
                                <button onClick={shareRoom} className="btn-primary flex-1 text-sm">
                                    🔗 Share Table
                                </button>
                            </div>

                            <div className="pt-4 border-t border-parchment-border flex items-center justify-center gap-3 text-xs font-serif text-parchment-muted">
                                <div className="w-2.5 h-2.5 rounded-full bg-gold animate-ping"></div>
                                Waiting for opponent to join table...
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
