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
            const { data: summaryData, error: summaryError } = await supabase
                .from('match_summaries')
                .select('*')
                .eq('match_id', matchId!)
                .single()

            if (summaryError) throw summaryError
            setSummary(summaryData)

            const { data: players, error: playersError } = await supabase
                .from('players')
                .select('*')
                .in('id', [summaryData.player1_id, summaryData.player2_id])

            if (playersError) throw playersError

            const p1 = players.find((p) => p.id === summaryData.player1_id)
            const p2 = players.find((p) => p.id === summaryData.player2_id)

            setPlayer1(p1 || null)
            setPlayer2(p2 || null)

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
                    <div className="w-14 h-14 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="font-serif text-parchment-muted">Calculating victory scrolls...</p>
                </div>
            </div>
        )
    }

    const isTie = !summary.winner_id

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Winner Announcement */}
                <div className="text-center mb-10 animate-scale-in">
                    {isTie ? (
                        <>
                            <div className="text-6xl mb-3">🤝</div>
                            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-2 text-gold-gradient">
                                Honorable Tie!
                            </h1>
                            <p className="text-lg font-serif text-parchment-dark">Both scholars fought to a perfect draw!</p>
                        </>
                    ) : isWinner ? (
                        <>
                            <div className="text-6xl mb-3">🏆</div>
                            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-2 text-gold-gradient">
                                Victory is Yours!
                            </h1>
                            <p className="text-lg font-serif text-parchment-dark">You have claimed top honor at the tavern table!</p>
                        </>
                    ) : (
                        <>
                            <div className="text-6xl mb-3">🛡️</div>
                            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-2 text-gold">
                                Valorous Effort!
                            </h1>
                            <p className="text-lg font-serif text-parchment-dark">A well-fought battle. Victory awaits next time!</p>
                        </>
                    )}
                </div>

                {/* Score Comparison */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Player 1 */}
                    <div className={`card-parchment ${summary.winner_id === summary.player1_id ? 'border-2 border-gold ring-2 ring-gold/40' : ''}`}>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-wood-medium text-gold border-2 border-gold/50 rounded-full flex items-center justify-center text-2xl font-serif font-bold mx-auto mb-3 shadow-md">
                                {player1?.display_name.slice(0, 2).toUpperCase()}
                            </div>
                            <h3 className="text-xl font-serif font-bold mb-1 text-parchment-text">{player1?.display_name}</h3>
                            <div className="text-4xl font-serif font-bold text-wood-dark mb-4">
                                {summary.player1_score.toLocaleString()}
                            </div>
                            <div className="space-y-1.5 text-xs font-serif text-parchment-muted border-t border-parchment-border pt-3">
                                <div>Accuracy: <span className="text-parchment-text font-bold">{summary.player1_accuracy.toFixed(1)}%</span></div>
                                <div>Average Response: <span className="text-parchment-text font-bold">{(summary.player1_avg_time_ms / 1000).toFixed(1)}s</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Player 2 */}
                    <div className={`card-parchment ${summary.winner_id === summary.player2_id ? 'border-2 border-gold ring-2 ring-gold/40' : ''}`}>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-wood-medium text-gold border-2 border-gold/50 rounded-full flex items-center justify-center text-2xl font-serif font-bold mx-auto mb-3 shadow-md">
                                {player2?.display_name.slice(0, 2).toUpperCase()}
                            </div>
                            <h3 className="text-xl font-serif font-bold mb-1 text-parchment-text">{player2?.display_name}</h3>
                            <div className="text-4xl font-serif font-bold text-wood-dark mb-4">
                                {summary.player2_score.toLocaleString()}
                            </div>
                            <div className="space-y-1.5 text-xs font-serif text-parchment-muted border-t border-parchment-border pt-3">
                                <div>Accuracy: <span className="text-parchment-text font-bold">{summary.player2_accuracy.toFixed(1)}%</span></div>
                                <div>Average Response: <span className="text-parchment-text font-bold">{(summary.player2_avg_time_ms / 1000).toFixed(1)}s</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Match Stats Scroll */}
                <div className="wood-panel mb-8">
                    <h3 className="text-base font-serif font-bold mb-4 text-center text-gold uppercase tracking-widest border-b border-gold/20 pb-2">
                        📜 Match Ledger 📜
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-center font-serif">
                        <div>
                            <div className="text-2xl md:text-3xl font-bold text-gold-light mb-1">
                                {Math.floor(summary.total_duration_seconds / 60)}:{(summary.total_duration_seconds % 60).toString().padStart(2, '0')}
                            </div>
                            <div className="text-xs text-parchment-muted">Duration</div>
                        </div>
                        <div>
                            <div className="text-2xl md:text-3xl font-bold text-gold mb-1">
                                {summary.player1_score + summary.player2_score}
                            </div>
                            <div className="text-xs text-parchment-muted">Total Points</div>
                        </div>
                        <div>
                            <div className="text-2xl md:text-3xl font-bold text-gold-light mb-1">
                                {Math.abs(summary.player1_score - summary.player2_score)}
                            </div>
                            <div className="text-xs text-parchment-muted">Point Differential</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate('/create')}
                        className="btn-primary"
                    >
                        🔄 Host Another Table
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="btn-secondary"
                    >
                        🏠 Return to Hall
                    </button>
                </div>
            </div>
        </div>
    )
}
