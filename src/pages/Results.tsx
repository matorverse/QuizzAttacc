import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, MatchSummary, Player } from '../lib/supabase'
import { clearGameState } from '../lib/gameLogic'

export default function Results() {
    const { matchId } = useParams<{ matchId: string }>()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState<MatchSummary | null>(null)
    const [player1, setPlayer1] = useState<Player | null>(null)
    const [player2, setPlayer2] = useState<Player | null>(null)
    const [isWinner, setIsWinner] = useState(false)

    useEffect(() => {
        const init = async () => {
            await loadResults()
            clearGameState()
        }
        init()
    }, [matchId])

    const loadResults = async () => {
        try {
            // Get match summary
            const { data: summaryData, error: summaryError } = await supabase
                .from('match_summaries')
                .select('*')
                .eq('match_id', matchId!)
                .single()

            if (summaryError) throw summaryError
            setSummary(summaryData)

            // Get player names
            const { data: players, error: playersError } = await supabase
                .from('players')
                .select('*')
                .in('id', [summaryData.player1_id, summaryData.player2_id])

            if (playersError) throw playersError

            const p1 = players.find((p) => p.id === summaryData.player1_id)
            const p2 = players.find((p) => p.id === summaryData.player2_id)

            setPlayer1(p1 || null)
            setPlayer2(p2 || null)

            // Determine if current player won
            const gameState = localStorage.getItem('quizexe_game_state')
            if (gameState) {
                const state = JSON.parse(gameState)
                setIsWinner(summaryData.winner_id === state.playerId)
            }

            setLoading(false)
        } catch (error) {
            console.error('Error loading results:', error)
        }
    }

    if (loading || !summary) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyber-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading results...</p>
                </div>
            </div>
        )
    }

    const isTie = !summary.winner_id

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Winner Announcement */}
                <div className="text-center mb-12 animate-scale-in">
                    {isTie ? (
                        <>
                            <div className="text-6xl mb-4">🤝</div>
                            <h1 className="text-5xl md:text-7xl font-bold mb-4 text-gradient">
                                It's a Tie!
                            </h1>
                            <p className="text-xl text-gray-300">Perfectly matched!</p>
                        </>
                    ) : isWinner ? (
                        <>
                            <div className="text-6xl mb-4">🏆</div>
                            <h1 className="text-5xl md:text-7xl font-bold mb-4 text-gradient">
                                Victory!
                            </h1>
                            <p className="text-xl text-gray-300">You won the battle!</p>
                        </>
                    ) : (
                        <>
                            <div className="text-6xl mb-4">💪</div>
                            <h1 className="text-5xl md:text-7xl font-bold mb-4 text-gradient">
                                Good Try!
                            </h1>
                            <p className="text-xl text-gray-300">Better luck next time!</p>
                        </>
                    )}
                </div>

                {/* Score Comparison */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Player 1 */}
                    <div className={`card ${summary.winner_id === summary.player1_id ? 'border-cyber-green' : ''}`}>
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-cyber-blue to-cyber-purple rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                                {player1?.display_name.slice(0, 2).toUpperCase()}
                            </div>
                            <h3 className="text-2xl font-bold mb-2">{player1?.display_name}</h3>
                            <div className="text-5xl font-bold text-cyber-blue mb-4">
                                {summary.player1_score.toLocaleString()}
                            </div>
                            <div className="space-y-2 text-sm text-gray-400">
                                <div>Accuracy: <span className="text-white">{summary.player1_accuracy.toFixed(1)}%</span></div>
                                <div>Avg Time: <span className="text-white">{(summary.player1_avg_time_ms / 1000).toFixed(1)}s</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Player 2 */}
                    <div className={`card ${summary.winner_id === summary.player2_id ? 'border-cyber-green' : ''}`}>
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-cyber-purple to-cyber-pink rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                                {player2?.display_name.slice(0, 2).toUpperCase()}
                            </div>
                            <h3 className="text-2xl font-bold mb-2">{player2?.display_name}</h3>
                            <div className="text-5xl font-bold text-cyber-purple mb-4">
                                {summary.player2_score.toLocaleString()}
                            </div>
                            <div className="space-y-2 text-sm text-gray-400">
                                <div>Accuracy: <span className="text-white">{summary.player2_accuracy.toFixed(1)}%</span></div>
                                <div>Avg Time: <span className="text-white">{(summary.player2_avg_time_ms / 1000).toFixed(1)}s</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Match Stats */}
                <div className="glass rounded-xl p-6 mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-center">Match Statistics</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-3xl font-bold text-cyber-blue mb-1">
                                {Math.floor(summary.total_duration_seconds / 60)}:{(summary.total_duration_seconds % 60).toString().padStart(2, '0')}
                            </div>
                            <div className="text-sm text-gray-400">Duration</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-cyber-purple mb-1">
                                {summary.player1_score + summary.player2_score}
                            </div>
                            <div className="text-sm text-gray-400">Total Points</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-cyber-pink mb-1">
                                {Math.abs(summary.player1_score - summary.player2_score)}
                            </div>
                            <div className="text-sm text-gray-400">Point Difference</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate('/create')}
                        className="btn-primary"
                    >
                        🔄 Play Again
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="btn-secondary"
                    >
                        🏠 Home
                    </button>
                </div>
            </div>
        </div>
    )
}
