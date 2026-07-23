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

    // Clean up Realtime subscription on unmount
    useEffect(() => {
        return () => {
            if (channelRef.current) {
                channelRef.current.unsubscribe()
                channelRef.current = null
            }
        }
    }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Attempt anonymous sign-in (non-blocking fallback for edge function guest handling)
            try {
                const { error: authError } = await supabase.auth.signInAnonymously()
                if (authError) console.warn('Supabase auth note:', authError.message)
            } catch (e) {
                console.warn('Auth fallback active')
            }

            // Call Edge Function
            const { data, error: functionError } = await supabase.functions.invoke('create-room', {
                body: formData,
            })

            if (functionError) {
                let exactError = functionError.message
                if (functionError.context && typeof functionError.context.json === 'function') {
                    try {
                        const ctx = await functionError.context.blob()
                        const text = await ctx.text()
                        const json = JSON.parse(text)
                        if (json?.error) exactError = json.error
                    } catch (e) { /* ignore parse error */ }
                }
                throw new Error(exactError)
            }
            if (!data.success) throw new Error(data.error)

            setRoomCode(data.roomCode)

            // Save game state
            saveGameState({
                matchId: data.matchId,
                playerId: data.playerId,
                opponentId: '',
                currentQuestionOrder: 1,
                totalQuestions: formData.questionCount,
                timePerQuestion: formData.timePerQuestion,
                topic: formData.topic,
                difficulty: formData.difficulty,
            })

            // Subscribe to match updates to detect when player 2 joins
            const channel = supabase
                .channel(`match:${data.matchId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'matches',
                        filter: `id=eq.${data.matchId}`,
                    },
                    (payload) => {
                        if (payload.new.status === 'active') {
                            navigate(`/game/${data.matchId}`)
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
                // User cancelled share
            }
        }
    }

    if (roomCode) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="wood-panel text-center">
                        <div className="inline-block px-3 py-1 bg-gold/20 text-gold rounded-full text-xs font-serif tracking-widest uppercase mb-2 border border-gold/40">
                            📜 Table Lobbies 📜
                        </div>
                        <h2 className="text-3xl font-serif font-bold mb-6 text-gold-gradient">Table Prepared!</h2>

                        <div className="mb-6">
                            <p className="text-parchment-muted text-sm mb-3">Share this 6-character code with your opponent:</p>
                            <div className="bg-wood-darker p-6 rounded-xl border-2 border-gold/50 shadow-inner">
                                <div className="text-4xl md:text-5xl font-serif font-bold text-gold-light tracking-widest mb-4">
                                    {roomCode.slice(0, 3)}-{roomCode.slice(3)}
                                </div>
                                <div className="flex gap-2 justify-center">
                                    <button onClick={copyRoomCode} className="btn-wood-secondary text-xs">
                                        📋 Copy Code
                                    </button>
                                    {typeof navigator.share === 'function' && (
                                        <button onClick={shareRoom} className="btn-wood-secondary text-xs">
                                            📤 Share
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-wood-medium/60 p-4 rounded-xl mb-6 border border-gold/30">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <div className="w-3 h-3 bg-gold rounded-full animate-pulse"></div>
                                <span className="text-gold font-serif font-semibold text-sm">Waiting for opponent to enter...</span>
                            </div>
                            <p className="text-xs text-parchment-muted">The match will start automatically when they join</p>
                        </div>

                        <div className="text-left text-xs font-serif text-parchment-muted space-y-1.5 bg-wood-darker/60 p-4 rounded-xl border border-wood-light/30">
                            <p>📚 Topic: <span className="text-parchment font-semibold">{formData.topic}</span></p>
                            <p>⚡ Difficulty: <span className="text-parchment font-semibold capitalize">{formData.difficulty}</span></p>
                            <p>❓ Questions: <span className="text-parchment font-semibold">{formData.questionCount}</span></p>
                            <p>⏱️ Time per question: <span className="text-parchment font-semibold">{formData.timePerQuestion}s</span></p>
                        </div>
                    </div>
                </div>
            </div>
        )
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
                                className="input cursor-pointer"
                                value={formData.topic}
                                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                            >
                                {TOPICS.map((topic) => (
                                    <option key={topic} value={topic} className="bg-wood-dark text-parchment">
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
                                        className={`py-2 px-3 rounded-xl font-serif text-xs font-semibold capitalize transition-all border ${formData.difficulty === diff
                                                ? 'bg-wood-dark text-gold border-gold shadow-md'
                                                : 'bg-parchment-dark/60 text-parchment-muted border-parchment-border hover:bg-parchment-dark'
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
                                        className={`py-2 px-3 rounded-xl font-serif text-xs font-semibold transition-all border ${formData.questionCount === count
                                                ? 'bg-wood-dark text-gold border-gold shadow-md'
                                                : 'bg-parchment-dark/60 text-parchment-muted border-parchment-border hover:bg-parchment-dark'
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
                                        className={`py-2 rounded-xl font-serif text-xs font-semibold transition-all border ${formData.timePerQuestion === time
                                                ? 'bg-wood-dark text-gold border-gold shadow-md'
                                                : 'bg-parchment-dark/60 text-parchment-muted border-parchment-border hover:bg-parchment-dark'
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
                            {loading ? 'Preparing Table...' : 'Create Table'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
