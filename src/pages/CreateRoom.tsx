import { useState } from 'react'
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
    const [matchId, setMatchId] = useState('')

    const [formData, setFormData] = useState({
        displayName: '',
        topic: TOPICS[0],
        difficulty: 'medium' as typeof DIFFICULTIES[number],
        questionCount: 10,
        timePerQuestion: 15,
    })

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Sign in anonymously
            const { error: authError } = await supabase.auth.signInAnonymously()
            if (authError) throw authError

            // Call Edge Function
            const { data, error: functionError } = await supabase.functions.invoke('create-room', {
                body: formData,
            })

            if (functionError) throw functionError
            if (!data.success) throw new Error(data.error)

            setRoomCode(data.roomCode)
            setMatchId(data.matchId)

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
                            // Player 2 joined, navigate to game
                            navigate(`/game/${data.matchId}`)
                        }
                    }
                )
                .subscribe()

            return () => {
                channel.unsubscribe()
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create room')
            setLoading(false)
        }
    }

    const copyRoomCode = () => {
        navigator.clipboard.writeText(roomCode)
    }

    const shareRoom = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join my Quizexe battle!',
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
                    <div className="card-glow text-center">
                        <h2 className="text-3xl font-bold mb-6 text-gradient">Room Created!</h2>

                        <div className="mb-8">
                            <p className="text-gray-400 mb-3">Share this code with your opponent:</p>
                            <div className="bg-cyber-darker p-6 rounded-lg border-2 border-cyber-blue">
                                <div className="text-5xl font-bold text-cyber-blue tracking-wider mb-4">
                                    {roomCode.slice(0, 3)}-{roomCode.slice(3)}
                                </div>
                                <div className="flex gap-2 justify-center">
                                    <button onClick={copyRoomCode} className="btn-secondary text-sm">
                                        📋 Copy Code
                                    </button>
                                    {navigator.share && (
                                        <button onClick={shareRoom} className="btn-secondary text-sm">
                                            📤 Share
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="glass p-4 rounded-lg mb-6">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                                <span className="text-yellow-400 font-medium">Waiting for opponent...</span>
                            </div>
                            <p className="text-sm text-gray-400">Game will start automatically when they join</p>
                        </div>

                        <div className="text-left text-sm text-gray-400 space-y-1">
                            <p>📚 Topic: <span className="text-white">{formData.topic}</span></p>
                            <p>⚡ Difficulty: <span className="text-white capitalize">{formData.difficulty}</span></p>
                            <p>❓ Questions: <span className="text-white">{formData.questionCount}</span></p>
                            <p>⏱️ Time per question: <span className="text-white">{formData.timePerQuestion}s</span></p>
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
                    className="mb-4 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                    ← Back
                </button>

                <div className="card">
                    <h2 className="text-3xl font-bold mb-6 text-gradient">Create Room</h2>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Your Name</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter your display name"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                minLength={2}
                                maxLength={30}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Topic</label>
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
                            <label className="block text-sm font-medium mb-2">Difficulty</label>
                            <div className="grid grid-cols-3 gap-2">
                                {DIFFICULTIES.map((diff) => (
                                    <button
                                        key={diff}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, difficulty: diff })}
                                        className={`py-2 rounded-lg font-medium transition-all ${formData.difficulty === diff
                                                ? 'bg-cyber-blue text-white'
                                                : 'bg-cyber-dark text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Number of Questions</label>
                            <div className="grid grid-cols-3 gap-2">
                                {QUESTION_COUNTS.map((count) => (
                                    <button
                                        key={count}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, questionCount: count })}
                                        className={`py-2 rounded-lg font-medium transition-all ${formData.questionCount === count
                                                ? 'bg-cyber-purple text-white'
                                                : 'bg-cyber-dark text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {count}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Time per Question</label>
                            <div className="grid grid-cols-4 gap-2">
                                {TIME_OPTIONS.map((time) => (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, timePerQuestion: time })}
                                        className={`py-2 rounded-lg font-medium transition-all ${formData.timePerQuestion === time
                                                ? 'bg-cyber-pink text-white'
                                                : 'bg-cyber-dark text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {time}s
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="bg-cyber-red/20 border border-cyber-red text-cyber-red p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary w-full" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Room'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
