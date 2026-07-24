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

    const computeDynamicSummary = async (): Promise<MatchSummary | null> => {
        try {
            const { data: matchData } = await supabase
                .from('matches')
                .select('*')
                .eq('id', matchId!)
                .single()

            if (!matchData) return null

            const p1Id = matchData.player1_id
            const p2Id = matchData.player2_id || ''

            const { data: scores } = await supabase
                .from('match_scores')
                .select('*')
                .eq('match_id', matchId!)

            const { data: answers } = await supabase
                .from('player_answers')
                .select('*')
                .eq('match_id', matchId!)

            let p1Score = 0, p2Score = 0
            let p1Correct = 0, p2Correct = 0
            let p1Total = 0, p2Total = 0
            let p1TimeSum = 0, p2TimeSum = 0

                ; (scores || []).forEach((s) => {
                    if (s.player_id === p1Id) p1Score += s.total_points
                    else if (s.player_id === p2Id) p2Score += s.total_points
                })

                ; (answers || []).forEach((a) => {
                    if (a.player_id === p1Id) {
                        p1Total++
                        p1TimeSum += a.time_taken_ms
                        if (a.is_correct) p1Correct++
                    } else if (a.player_id === p2Id) {
                        p2Total++
                        p2TimeSum += a.time_taken_ms
                        if (a.is_correct) p2Correct++
                    }
                })

            const p1AvgTime = p1Total > 0 ? Math.round(p1TimeSum / p1Total) : 0
            const p2AvgTime = p2Total > 0 ? Math.round(p2TimeSum / p2Total) : 0
            const p1Acc = p1Total > 0 ? Math.round((p1Correct / p1Total) * 100) : 0
            const p2Acc = p2Total > 0 ? Math.round((p2Correct / p2Total) * 100) : 0

            let winnerId: string | undefined = undefined
            if (p1Score > p2Score) winnerId = p1Id
            else if (p2Score > p1Score) winnerId = p2Id
            else if (p1AvgTime < p2AvgTime && p1AvgTime > 0) winnerId = p1Id
            else if (p2AvgTime < p1AvgTime && p2AvgTime > 0) winnerId = p2Id

            const startTime = matchData.started_at ? new Date(matchData.started_at).getTime() : Date.now()
            const finishTime = matchData.finished_at ? new Date(matchData.finished_at).getTime() : Date.now()
            const duration = Math.max(1, Math.round((finishTime - startTime) / 1000))

            return {
                id: `dynamic-${matchId}`,
                match_id: matchId!,
                winner_id: winnerId,
                player1_id: p1Id,
                player2_id: p2Id || p1Id,
                player1_score: p1Score,
                player2_score: p2Score,
                player1_accuracy: p1Acc,
                player2_accuracy: p2Acc,
                player1_avg_time_ms: p1AvgTime,
                player2_avg_time_ms: p2AvgTime,
                total_duration_seconds: duration,
                created_at: new Date().toISOString(),
            }
        } catch (e) {
            console.error('Failed to compute dynamic summary fallback:', e)
            return null
        }
    }

    const loadResults = async () => {
        try {
            let summaryData: MatchSummary | null = null

            // Try loading pre-generated match summary
            const { data, error: summaryError } = await supabase
                .from('match_summaries')
                .select('*')
                .eq('match_id', matchId!)
                .single()

            if (!summaryError && data) {
                summaryData = data
            } else {
                // Compute dynamically from player scores and answers
                summaryData = await computeDynamicSummary()
            }

            if (!summaryData) {
                // Short wait retry if DB trigger was slightly delayed
                await new Promise((resolve) => setTimeout(resolve, 800))
                const { data: retryData } = await supabase
                    .from('match_summaries')
                    .select('*')
                    .eq('match_id', matchId!)
                    .single()
                if (retryData) {
                    summaryData = retryData
                } else {
                    summaryData = await computeDynamicSummary()
                }
            }

            if (summaryData) {
                setSummary(summaryData)

                const playerIds = [summaryData.player1_id, summaryData.player2_id].filter(Boolean)
                if (playerIds.length > 0) {
                    const { data: players } = await supabase
                        .from('players')
                        .select('*')
                        .in('id', playerIds)

                    if (players) {
                        const p1 = players.find((p) => p.id === summaryData.player1_id)
                        const p2 = players.find((p) => p.id === summaryData.player2_id)
                        setPlayer1(p1 || null)
                        setPlayer2(p2 || null)
                    }
                }

                const savedState = localStorage.getItem('quizexe_game_state')
                if (savedState) {
                    try {
                        const state = JSON.parse(savedState)
                        const winner = summaryData.winner_id === state.playerId
                        setIsWinner(winner)
                        if (winner) {
                            import('../lib/audio').then((m) => m.playVictory()).catch(() => { })
                        }
                    } catch {
                        // ignore parse error
                    }
                }
            }
        } catch (error) {
            console.error('Error loading results:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRematch = () => {
        try {
            const savedStateStr = localStorage.getItem('quizexe_game_state')
            let topic = 'General Knowledge'
            let difficulty = 'medium'
            let questionCount = 10
            let timePerQuestion = 15

            if (savedStateStr) {
                try {
                    const st = JSON.parse(savedStateStr)
                    if (st.topic) topic = st.topic
                    if (st.difficulty) difficulty = st.difficulty
                    if (st.totalQuestions) questionCount = st.totalQuestions
                    if (st.timePerQuestion) timePerQuestion = st.timePerQuestion
                } catch {
                    // ignore
                }
            }

            sessionStorage.setItem('quizexe_rematch_preset', JSON.stringify({
                topic,
                difficulty,
                questionCount,
                timePerQuestion,
            }))
            navigate('/create')
        } catch {
            navigate('/create')
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
                        onClick={handleRematch}
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        ⚡ Instant Rematch
                    </button>
                    <button
                        onClick={() => navigate('/create')}
                        className="btn-secondary flex items-center justify-center gap-2"
                    >
                        🔄 Host New Table
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="btn-secondary flex items-center justify-center gap-2"
                    >
                        🏠 Return to Hall
                    </button>
                </div>
            </div>
        </div>
    )
}
