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
            // Sign in anonymously
            const { error: authError } = await supabase.auth.signInAnonymously()
            if (authError) throw authError

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
                    className="mb-4 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                    ← Back
                </button>

                <div className="card">
                    <h2 className="text-3xl font-bold mb-6 text-gradient">Join Room</h2>

                    <form onSubmit={handleJoin} className="space-y-4">
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
                            <label className="block text-sm font-medium mb-2">Room Code</label>
                            <input
                                type="text"
                                className="input text-center text-2xl font-bold tracking-wider"
                                placeholder="XXX-XXX"
                                value={formData.roomCode}
                                onChange={handleRoomCodeChange}
                                maxLength={7}
                                required
                            />
                            <p className="text-xs text-gray-400 mt-1">Enter the 6-character code from your opponent</p>
                        </div>

                        {error && (
                            <div className="bg-cyber-red/20 border border-cyber-red text-cyber-red p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary w-full" disabled={loading}>
                            {loading ? 'Joining...' : 'Join Battle'}
                        </button>
                    </form>

                    <div className="mt-6 glass p-4 rounded-lg">
                        <p className="text-sm text-gray-400 text-center">
                            💡 <span className="text-white">Tip:</span> The game starts immediately after you join!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
