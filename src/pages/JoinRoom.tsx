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

    const handleJoin = async (e: React.FormEvent) => {
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

            const cleanCode = parseRoomCode(formData.roomCode)

            // Call Edge Function
            const { data, error: functionError } = await supabase.functions.invoke('join-room', {
                body: {
                    displayName: formData.displayName,
                    roomCode: cleanCode,
                },
            })

            if (functionError) throw functionError
            if (!data.success) throw new Error(data.error)

            // Save game state
            saveGameState({
                matchId: data.matchId,
                playerId: data.playerId,
                opponentId: data.opponent.id,
                currentQuestionOrder: 1,
                totalQuestions: data.roomSettings.questionCount,
                timePerQuestion: data.roomSettings.timePerQuestion,
                topic: data.roomSettings.topic,
                difficulty: data.roomSettings.difficulty,
            })

            // Navigate to game
            navigate(`/game/${data.matchId}`)
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
