import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, Question, MatchScore } from '../lib/supabase'
import { loadGameState, getStreakText } from '../lib/gameLogic'
import { playClick, playCorrect, playIncorrect, playStreak, isAudioMuted, toggleAudioMute } from '../lib/audio'
import Timer from '../components/Timer'
import ScoreBoard from '../components/ScoreBoard'
import ConnectionStatus from '../components/ConnectionStatus'

export default function GameArena() {
    const { matchId } = useParams<{ matchId: string }>()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
    const [questionOrder, setQuestionOrder] = useState(1)
    const [totalQuestions, setTotalQuestions] = useState(10)
    const [timePerQuestion, setTimePerQuestion] = useState(15)

    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [showFeedback, setShowFeedback] = useState(false)
    const [waitingForOpponent, setWaitingForOpponent] = useState(false)
    const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())

    const [myPlayerName, setMyPlayerName] = useState('You')
    const [opponentPlayerName, setOpponentPlayerName] = useState('Opponent')
    const [myScore, setMyScore] = useState(0)
    const [opponentScore, setOpponentScore] = useState(0)
    const [myStreak, setMyStreak] = useState(0)
    const [opponentStreak, setOpponentStreak] = useState(0)
    const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected')
    const [muted, setMuted] = useState(isAudioMuted())

    const prefetchedQuestionsRef = useRef<Record<number, Question>>({})
    const gameState = useMemo(() => loadGameState(), [])

    useEffect(() => {
        if (!matchId || !gameState) {
            navigate('/')
            return
        }

        if (gameState.totalQuestions) setTotalQuestions(gameState.totalQuestions)
        if (gameState.timePerQuestion) setTimePerQuestion(gameState.timePerQuestion)

        let isMounted = true

        const initializeArena = async () => {
            try {
                const { data: matchData, error: matchError } = await supabase
                    .from('matches')
                    .select('*, rooms(*)')
                    .eq('id', matchId)
                    .single()

                if (matchError || !matchData) {
                    navigate('/')
                    return
                }

                if (matchData.status === 'finished') {
                    navigate(`/results/${matchId}`)
                    return
                }

                if (matchData.rooms?.question_count) setTotalQuestions(matchData.rooms.question_count)
                if (matchData.rooms?.time_per_question) setTimePerQuestion(matchData.rooms.time_per_question)

                const p1Id = matchData.player1_id
                const p2Id = matchData.player2_id

                if (p1Id || p2Id) {
                    const playerIds = [p1Id, p2Id].filter(Boolean)
                    const { data: playersData } = await supabase
                        .from('players')
                        .select('id, display_name')
                        .in('id', playerIds)

                    if (playersData && isMounted) {
                        const myPlayer = playersData.find((p) => p.id === gameState.playerId)
                        const oppPlayer = playersData.find((p) => p.id !== gameState.playerId)

                        if (myPlayer) setMyPlayerName(myPlayer.display_name)
                        if (oppPlayer) setOpponentPlayerName(oppPlayer.display_name)
                    }
                }

                const { data: scoresData } = await supabase
                    .from('match_scores')
                    .select('*')
                    .eq('match_id', matchId)

                if (scoresData && isMounted) {
                    let mScore = 0
                    let oScore = 0
                    let mStreak = 0
                    let oStreak = 0

                    scoresData.forEach((s: MatchScore) => {
                        if (s.player_id === gameState.playerId) {
                            mScore += s.total_points
                            mStreak = s.current_streak
                        } else {
                            oScore += s.total_points
                            oStreak = s.current_streak
                        }
                    })

                    setMyScore(mScore)
                    setOpponentScore(oScore)
                    setMyStreak(mStreak)
                    setOpponentStreak(oStreak)
                }

                const { data: answeredQuestions } = await supabase
                    .from('player_answers')
                    .select('question_id')
                    .eq('match_id', matchId)
                    .eq('player_id', gameState.playerId)

                let nextOrder = 1
                if (answeredQuestions && answeredQuestions.length > 0) {
                    nextOrder = answeredQuestions.length + 1
                }

                if (nextOrder > (matchData.rooms?.question_count || gameState.totalQuestions || 10)) {
                    setWaitingForOpponent(true)
                    setLoading(false)
                } else {
                    await loadQuestion(nextOrder)
                }
            } catch (err) {
                console.error('Initialization error:', err)
            }
        }

        initializeArena()

        const scoreChannel = supabase
            .channel(`match_scores:${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'match_scores',
                    filter: `match_id=eq.${matchId}`,
                },
                (payload) => {
                    const score = payload.new as MatchScore
                    if (score.player_id === gameState.playerId) {
                        setMyScore((prev) => prev + score.total_points)
                        setMyStreak(score.current_streak)
                    } else {
                        setOpponentScore((prev) => prev + score.total_points)
                        setOpponentStreak(score.current_streak)
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setConnectionState('connected')
                } else if (status === 'CHANNEL_ERROR') {
                    setConnectionState('disconnected')
                }
            })

        const matchChannel = supabase
            .channel(`match_status:${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'matches',
                    filter: `id=eq.${matchId}`,
                },
                (payload) => {
                    if (payload.new.status === 'finished') {
                        navigate(`/results/${matchId}`)
                    }
                }
            )
            .subscribe()

        return () => {
            isMounted = false
            scoreChannel.unsubscribe()
            matchChannel.unsubscribe()
        }
    }, [matchId])

    useEffect(() => {
        if (!waitingForOpponent || !matchId) return

        let isSubscribed = true
        const checkStatus = async () => {
            const { data } = await supabase
                .from('matches')
                .select('status')
                .eq('id', matchId)
                .single()

            if (isSubscribed && data && data.status === 'finished') {
                navigate(`/results/${matchId}`)
            }
        }

        checkStatus()
        const interval = setInterval(checkStatus, 1500)
        return () => {
            isSubscribed = false
            clearInterval(interval)
        }
    }, [waitingForOpponent, matchId, navigate])

    useEffect(() => {
        if (!matchId || connectionState === 'connected') return

        const fetchScoresFallback = async () => {
            const { data: scoresData } = await supabase
                .from('match_scores')
                .select('*')
                .eq('match_id', matchId)

            if (scoresData && gameState) {
                let mScore = 0
                let oScore = 0
                let mStreak = 0
                let oStreak = 0

                scoresData.forEach((s: MatchScore) => {
                    if (s.player_id === gameState.playerId) {
                        mScore += s.total_points
                        mStreak = s.current_streak
                    } else {
                        oScore += s.total_points
                        oStreak = s.current_streak
                    }
                })

                setMyScore(mScore)
                setOpponentScore(oScore)
                setMyStreak(mStreak)
                setOpponentStreak(oStreak)
            }
        }

        fetchScoresFallback()
        const interval = setInterval(fetchScoresFallback, 2500)
        return () => clearInterval(interval)
    }, [matchId, connectionState, gameState])

    const prefetchQuestion = async (order: number) => {
        if (!matchId || prefetchedQuestionsRef.current[order]) return
        try {
            const { data: matchQuestion } = await supabase
                .from('match_questions')
                .select('question_id, questions(*)')
                .eq('match_id', matchId)
                .eq('question_order', order)
                .single()

            if (matchQuestion?.questions) {
                // @ts-ignore
                prefetchedQuestionsRef.current[order] = matchQuestion.questions
            }
        } catch {
            // Background prefetch errors fail silently
        }
    }

    const loadQuestion = async (order: number) => {
        try {
            let questionToSet: Question | null = null
            let startTimeMs = Date.now()

            const { data: matchQuestion, error: mqError } = await supabase
                .from('match_questions')
                .select('question_id, started_at, questions(*)')
                .eq('match_id', matchId!)
                .eq('question_order', order)
                .single()

            if (!mqError && matchQuestion) {
                // @ts-ignore
                questionToSet = matchQuestion.questions
                if (matchQuestion.started_at) {
                    startTimeMs = new Date(matchQuestion.started_at).getTime()
                } else {
                    const nowIso = new Date().toISOString()
                    startTimeMs = new Date(nowIso).getTime()
                    supabase
                        .from('match_questions')
                        .update({ started_at: nowIso })
                        .eq('match_id', matchId!)
                        .eq('question_order', order)
                        .then()
                }
            } else if (prefetchedQuestionsRef.current[order]) {
                questionToSet = prefetchedQuestionsRef.current[order]
            } else {
                throw mqError
            }

            setCurrentQuestion(questionToSet)
            setQuestionOrder(order)
            setQuestionStartTime(startTimeMs)
            setSelectedAnswer(null)
            setIsCorrect(null)
            setCorrectAnswerIndex(null)
            setShowFeedback(false)
            setLoading(false)

            // Trigger background prefetch for the next question scroll
            prefetchQuestion(order + 1)
        } catch (error) {
            console.error('Error loading question:', error)
        }
    }

    const handleAnswerSelect = async (answerIndex: number) => {
        if (submitting || selectedAnswer !== null) return

        playClick()
        setSelectedAnswer(answerIndex)
        setSubmitting(true)

        const timeTaken = Date.now() - questionStartTime
        let result: any = null

        try {
            const { data, error } = await supabase.functions.invoke('submit-answer', {
                body: {
                    matchId,
                    playerId: gameState?.playerId,
                    questionId: currentQuestion?.id,
                    selectedAnswerIndex: answerIndex,
                    timeTakenMs: timeTaken,
                    submittedAt: new Date().toISOString(),
                },
            })

            if (error || !data?.success) {
                console.warn('Edge function invoke fallback, using direct client DB:', error?.message || data?.error)
                result = await submitAnswerDirectly(answerIndex, timeTaken)
            } else {
                result = data
            }
        } catch (edgeErr) {
            console.warn('Edge Function unavailable, submitting answer directly via DB:', edgeErr)
            result = await submitAnswerDirectly(answerIndex, timeTaken)
        }

        if (!result || !result.success) {
            setSubmitting(false)
            setSelectedAnswer(null)
            return
        }

        setIsCorrect(result.isCorrect)
        setCorrectAnswerIndex(result.correctAnswerIndex)
        setShowFeedback(true)

        if (result.isCorrect) {
            playCorrect()
            if (myStreak >= 2) playStreak()
        } else {
            playIncorrect()
        }

        setTimeout(() => {
            if (result.matchComplete) {
                navigate(`/results/${matchId}`)
            } else if (result.isPlayerFinished || questionOrder >= totalQuestions) {
                setWaitingForOpponent(true)
            } else {
                const nextOrder = questionOrder + 1
                if (nextOrder <= totalQuestions) {
                    loadQuestion(nextOrder)
                    setSubmitting(false)
                } else {
                    setWaitingForOpponent(true)
                }
            }
        }, 2500)
    }

    const submitAnswerDirectly = async (answerIndex: number, timeTaken: number) => {
        const correctIndex = currentQuestion?.correct_answer_index ?? 0
        const isAnsCorrect = answerIndex === correctIndex

        let basePoints = 0
        let timeBonus = 0
        let multiplier = 1.0

        if (isAnsCorrect) {
            basePoints = 100
            const timePerMs = timePerQuestion * 1000
            const remainingRatio = Math.max(0, (timePerMs - timeTaken) / timePerMs)
            timeBonus = Math.floor(remainingRatio * 50)

            const newStreak = myStreak + 1
            if (newStreak >= 3) multiplier = 1.3
            else if (newStreak === 2) multiplier = 1.1

            const totalPts = Math.floor((basePoints + timeBonus) * multiplier)

            await supabase.from('player_answers').insert({
                match_id: matchId,
                player_id: gameState?.playerId,
                question_id: currentQuestion?.id,
                selected_answer_index: answerIndex,
                is_correct: true,
                time_taken_ms: timeTaken,
            })

            await supabase.from('match_scores').insert({
                match_id: matchId,
                player_id: gameState?.playerId,
                question_id: currentQuestion?.id,
                base_points: basePoints,
                time_bonus: timeBonus,
                streak_multiplier: multiplier,
                total_points: totalPts,
                current_streak: newStreak,
            })
        } else {
            await supabase.from('player_answers').insert({
                match_id: matchId,
                player_id: gameState?.playerId,
                question_id: currentQuestion?.id,
                selected_answer_index: answerIndex,
                is_correct: false,
                time_taken_ms: timeTaken,
            })

            await supabase.from('match_scores').insert({
                match_id: matchId,
                player_id: gameState?.playerId,
                question_id: currentQuestion?.id,
                base_points: 0,
                time_bonus: 0,
                streak_multiplier: 1.0,
                total_points: 0,
                current_streak: 0,
            })
        }

        const isLastQuestion = questionOrder >= totalQuestions

        const { data: totalAnswers } = await supabase
            .from('player_answers')
            .select('id')
            .eq('match_id', matchId!)

        const expectedAnswers = totalQuestions * 2
        const isMatchFinished = (totalAnswers?.length || 0) >= expectedAnswers

        if (isMatchFinished) {
            await supabase
                .from('matches')
                .update({
                    status: 'finished',
                    finished_at: new Date().toISOString(),
                })
                .eq('id', matchId!)
        }

        return {
            success: true,
            isCorrect: isAnsCorrect,
            correctAnswerIndex: correctIndex,
            matchComplete: isMatchFinished,
            isPlayerFinished: isLastQuestion,
        }
    }

    const handleTimeout = useCallback(() => {
        if (selectedAnswer === null && !submitting && !waitingForOpponent) {
            handleAnswerSelect(-1)
        }
    }, [selectedAnswer, submitting, waitingForOpponent])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-14 h-14 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="font-serif text-parchment-muted">Preparing question scroll...</p>
                </div>
            </div>
        )
    }

    if (waitingForOpponent) {
        return (
            <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">
                <div className="max-w-xl w-full">
                    <div className="flex items-center justify-between mb-6">
                        <ConnectionStatus state={connectionState} />
                    </div>

                    <ScoreBoard
                        player1Name={myPlayerName}
                        player2Name={opponentPlayerName}
                        player1Score={myScore}
                        player2Score={opponentScore}
                        player1Streak={myStreak}
                        player2Streak={opponentStreak}
                    />

                    <div className="wood-panel text-center p-8 mt-6">
                        <div className="w-14 h-14 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                        <h2 className="text-3xl font-serif font-bold mb-3 text-gold-gradient">All Questions Answered!</h2>
                        <p className="text-parchment-muted font-body mb-4">
                            You've answered all question scrolls. Waiting for <span className="text-gold-light font-serif font-bold">{opponentPlayerName}</span> to finish...
                        </p>
                        <div className="bg-wood-darker p-4 rounded-xl text-xs font-serif text-gold border border-gold/30">
                            📜 Live scores update in real-time. You will be redirected to victory results automatically!
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!currentQuestion) return null

    return (
        <div className="min-h-screen p-4 md:p-8 relative">
            {/* Floating Connection Fluctuation Banner */}
            {connectionState !== 'connected' && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-900/90 text-amber-200 border border-amber-500/50 px-4 py-2 rounded-full text-xs font-serif shadow-lg animate-pulse flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Network fluctuating - scores auto-syncing via backup link...
                </div>
            )}

            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 font-serif">
                    <div className="text-xs md:text-sm text-parchment-muted tracking-wider uppercase">
                        Question Scroll {questionOrder} of {totalQuestions}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMuted(toggleAudioMute())}
                            className="px-2.5 py-1 rounded-lg bg-wood-medium/70 text-gold hover:text-gold-light border border-gold/40 text-xs font-serif transition-colors flex items-center gap-1 shadow-sm"
                            title={muted ? 'Unmute Sound' : 'Mute Sound'}
                        >
                            {muted ? '🔇 Muted' : '🔊 Sound'}
                        </button>
                        <ConnectionStatus state={connectionState} />
                    </div>
                </div>

                {/* Scoreboard */}
                <ScoreBoard
                    player1Name={myPlayerName}
                    player2Name={opponentPlayerName}
                    player1Score={myScore}
                    player2Score={opponentScore}
                    player1Streak={myStreak}
                    player2Streak={opponentStreak}
                />

                {/* Timer */}
                <div className="flex justify-center mb-6">
                    <Timer
                        key={questionOrder}
                        duration={timePerQuestion}
                        startTime={questionStartTime}
                        onTimeout={handleTimeout}
                        paused={showFeedback}
                    />
                </div>

                {/* Question Scroll Card */}
                <div className="card-parchment mb-6 animate-scale-in">
                    <div className="inline-block px-3 py-1 bg-parchment-dark/70 text-parchment-muted rounded-full text-xs font-serif font-semibold tracking-wider uppercase mb-4 border border-parchment-border">
                        {currentQuestion.topic} • {currentQuestion.difficulty}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold mb-8 text-center text-parchment-text leading-snug">
                        {currentQuestion.question_text}
                    </h2>

                    {/* Wooden Option Tile Buttons */}
                    <div className="space-y-3">
                        {currentQuestion.options.map((option, index) => {
                            const isSelected = selectedAnswer === index
                            const isThisCorrect = correctAnswerIndex === index
                            const isThisWrong = showFeedback && isSelected && !isCorrect

                            let buttonClass = 'answer-btn'
                            if (showFeedback) {
                                if (isThisCorrect) {
                                    buttonClass += ' answer-btn-correct'
                                } else if (isThisWrong) {
                                    buttonClass += ' answer-btn-incorrect'
                                }
                            } else if (isSelected) {
                                buttonClass += ' answer-btn-selected'
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleAnswerSelect(index)}
                                    disabled={submitting || showFeedback}
                                    className={buttonClass}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-wood-medium border border-gold/40 text-gold flex items-center justify-center font-serif font-bold text-sm flex-shrink-0 shadow-sm">
                                            {String.fromCharCode(65 + index)}
                                        </div>
                                        <div className="flex-1 text-left font-body">{option}</div>
                                        {showFeedback && isThisCorrect && <span className="text-forest font-bold">✓</span>}
                                        {showFeedback && isThisWrong && <span className="text-burgundy font-bold">✗</span>}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* Feedback Explanation */}
                    {showFeedback && (
                        <div className="mt-6 animate-slide-up">
                            <div
                                className={`p-4 rounded-xl border-2 ${isCorrect
                                        ? 'bg-forest/10 border-forest text-forest'
                                        : 'bg-burgundy/10 border-burgundy text-burgundy'
                                    }`}
                            >
                                <div className="font-serif font-bold text-base mb-1">
                                    {isCorrect ? '✓ Excellent! Correct Answer.' : '✗ Incorrect Choice'}
                                </div>
                                {currentQuestion.explanation && (
                                    <div className="text-xs font-body text-parchment-muted leading-relaxed">{currentQuestion.explanation}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Streak indicator */}
                {myStreak > 0 && !showFeedback && (
                    <div className="text-center font-serif text-gold font-bold animate-pulse text-sm">
                        {getStreakText(myStreak)} Streak Multiplier Active!
                    </div>
                )}
            </div>
        </div>
    )
}
