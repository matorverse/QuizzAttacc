import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, Question, MatchScore } from '../lib/supabase'
import { loadGameState, getStreakText, getPlayerAvatar, decodeHtmlEntities } from '../lib/gameLogic'
import { playClick, playCorrect, playIncorrect, playStreak, isAudioMuted, toggleAudioMute, triggerHaptic } from '../lib/audio'
import { getLocalPublicQuestions, getLocalMatch, submitLocalAnswer, forfeitLocalMatch, subscribeDuelEvents, broadcastDuelEvent } from '../lib/localDuel'
import Timer from '../components/Timer'
import ScoreBoard from '../components/ScoreBoard'
import ConnectionStatus from '../components/ConnectionStatus'
import BattleProgressBar from '../components/BattleProgressBar'

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
    const [forfeitCountdown, setForfeitCountdown] = useState<number>(30)

    const [myPlayerName, setMyPlayerName] = useState('You')
    const [opponentPlayerName, setOpponentPlayerName] = useState('Opponent')
    const [myScore, setMyScore] = useState(0)
    const [opponentScore, setOpponentScore] = useState(0)
    const [myStreak, setMyStreak] = useState(0)
    const [opponentStreak, setOpponentStreak] = useState(0)
    const [opponentQuestionOrder, setOpponentQuestionOrder] = useState(1)
    const [opponentAnsweredCurrent, setOpponentAnsweredCurrent] = useState(false)
    const [floatingScoreText, setFloatingScoreText] = useState<string | null>(null)

    const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected')
    const [muted, setMuted] = useState(isAudioMuted())

    // Zero-knowledge question deck (does NOT contain correct_answer_index)
    const prefetchedQuestionsRef = useRef<Record<number, Question>>({})
    const questionOrderRef = useRef<number>(1)
    const eventsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
    const gameState = useMemo(() => loadGameState(), [])

    useEffect(() => {
        if (!matchId || !gameState) {
            navigate('/')
            return
        }

        if (gameState.totalQuestions) setTotalQuestions(gameState.totalQuestions)
        if (gameState.timePerQuestion) setTimePerQuestion(gameState.timePerQuestion)

        let isMounted = true

        // If local duel match
        if (matchId.startsWith('match-')) {
            setConnectionState('connected')
            const qList = getLocalPublicQuestions(matchId)
            if (qList && isMounted) {
                qList.forEach((item) => {
                    // @ts-ignore
                    prefetchedQuestionsRef.current[item.question_order] = item.questions
                })
            }

            const lMatch = getLocalMatch(matchId)
            if (lMatch && isMounted) {
                setTotalQuestions(lMatch.questions.length)
                if (lMatch.player1_id === gameState.playerId) {
                    setMyPlayerName(lMatch.player1_name)
                    setOpponentPlayerName(lMatch.player2_name || 'Opponent')
                } else {
                    setMyPlayerName(lMatch.player2_name || 'Guest')
                    setOpponentPlayerName(lMatch.player1_name)
                }
            }

            // Subscribe to local duel events
            const unsub = subscribeDuelEvents(matchId, (event, payload) => {
                if (!isMounted) return
                if (event === 'PLAYER_ANSWERED' && payload.playerId !== gameState.playerId) {
                    setOpponentQuestionOrder(payload.questionOrder || 1)
                    if (payload.questionOrder === questionOrderRef.current) {
                        setOpponentAnsweredCurrent(true)
                    }
                } else if (event === 'SCORE_UPDATED' && payload.playerId !== gameState.playerId) {
                    setOpponentScore((prev) => prev + (payload.totalPoints || 0))
                    setOpponentStreak(payload.currentStreak || 0)
                } else if (event === 'MATCH_FINISHED') {
                    navigate(`/results/${matchId}`)
                }
            })

            loadQuestion(1)

            return () => {
                isMounted = false
                unsub()
            }
        }

        const initializeArena = async () => {
            try {

                // Zero-knowledge question retrieval: strictly omit correct_answer_index and explanation
                const { data: mqList } = await supabase
                    .from('match_questions')
                    .select('question_order, question_id, questions(id, topic, difficulty, question_text, options)')
                    .eq('match_id', matchId)
                    .order('question_order', { ascending: true })

                if (mqList && isMounted) {
                    mqList.forEach((item) => {
                        if (item.questions) {
                            // @ts-ignore
                            prefetchedQuestionsRef.current[item.question_order] = item.questions
                        }
                    })
                }

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

        // Realtime Scores Channel
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

        // Realtime Match Status Channel
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

        // Realtime Broadcast Channel for Live Opponent Progress
        const eventsChannel = supabase
            .channel(`match_events:${matchId}`)
            .on('broadcast', { event: 'PLAYER_ANSWERED' }, (payload) => {
                if (payload.payload?.playerId !== gameState.playerId) {
                    const oppOrder = payload.payload?.questionOrder || 1
                    setOpponentQuestionOrder(oppOrder)
                    if (oppOrder === questionOrderRef.current) {
                        setOpponentAnsweredCurrent(true)
                    }
                }
            })
            .subscribe()

        eventsChannelRef.current = eventsChannel

        // Mobile visibility resume listener
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                scoreChannel.subscribe()
                matchChannel.subscribe()
                eventsChannel.subscribe()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            isMounted = false
            scoreChannel.unsubscribe()
            matchChannel.unsubscribe()
            eventsChannel.unsubscribe()
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [matchId])

    // Waiting for opponent handler with forfeit countdown
    useEffect(() => {
        if (!waitingForOpponent || !matchId) return

        let isSubscribed = true
        const checkStatus = async () => {
            if (matchId.startsWith('match-')) {
                const lMatch = getLocalMatch(matchId)
                if (isSubscribed && lMatch && lMatch.status === 'finished') {
                    navigate(`/results/${matchId}`)
                }
                return
            }

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
        const statusInterval = setInterval(checkStatus, 1500)

        // 30s countdown for forfeit option
        const countdownInterval = setInterval(() => {
            setForfeitCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownInterval)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            isSubscribed = false
            clearInterval(statusInterval)
            clearInterval(countdownInterval)
        }
    }, [waitingForOpponent, matchId, navigate])

    // Score fallback during network blips
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
        const interval = setInterval(fetchScoresFallback, 3000)
        return () => clearInterval(interval)
    }, [matchId, connectionState, gameState])

    const prefetchQuestion = async (order: number) => {
        if (!matchId || prefetchedQuestionsRef.current[order]) return
        try {
            const { data: matchQuestion } = await supabase
                .from('match_questions')
                .select('question_id, questions(id, topic, difficulty, question_text, options)')
                .eq('match_id', matchId)
                .eq('question_order', order)
                .single()

            if (matchQuestion?.questions) {
                // @ts-ignore
                prefetchedQuestionsRef.current[order] = matchQuestion.questions
            }
        } catch {
            // Background prefetch fail safe
        }
    }

    const loadQuestion = async (order: number) => {
        try {
            let questionToSet: Question | null = null
            const startTimeMs = Date.now()

            if (prefetchedQuestionsRef.current[order]) {
                questionToSet = prefetchedQuestionsRef.current[order]
            } else {
                const { data: matchQuestion, error: mqError } = await supabase
                    .from('match_questions')
                    .select('question_id, questions(id, topic, difficulty, question_text, options)')
                    .eq('match_id', matchId!)
                    .eq('question_order', order)
                    .single()

                if (!mqError && matchQuestion) {
                    // @ts-ignore
                    questionToSet = matchQuestion.questions
                } else {
                    throw mqError
                }
            }

            setCurrentQuestion(questionToSet)
            setQuestionOrder(order)
            questionOrderRef.current = order
            setQuestionStartTime(startTimeMs)
            setSelectedAnswer(null)
            setIsCorrect(null)
            setCorrectAnswerIndex(null)
            setShowFeedback(false)
            setOpponentAnsweredCurrent(false)
            setFloatingScoreText(null)
            setLoading(false)

            prefetchQuestion(order + 1)
        } catch (error) {
            console.error('Error loading question:', error)
        }
    }

    const handleAnswerSelect = async (answerIndex: number) => {
        if (submitting || selectedAnswer !== null || !currentQuestion) return

        // Instant click feedback
        playClick()
        setSelectedAnswer(answerIndex)
        setSubmitting(true)

        const timeTaken = Math.max(0, Date.now() - questionStartTime)

        // Broadcast to opponent that answer is locked in
        if (eventsChannelRef.current) {
            eventsChannelRef.current.send({
                type: 'broadcast',
                event: 'PLAYER_ANSWERED',
                payload: {
                    playerId: gameState?.playerId,
                    questionOrder,
                },
            })
        }

        // Server-authoritative answer submission & verification
        let serverResult: any = null

        // 0. If local tavern duel
        if (matchId?.startsWith('match-')) {
            broadcastDuelEvent(matchId, 'PLAYER_ANSWERED', { playerId: gameState?.playerId, questionOrder })
            serverResult = submitLocalAnswer({
                matchId,
                playerId: gameState?.playerId || '',
                questionId: currentQuestion.id,
                selectedAnswerIndex: answerIndex,
                timeTakenMs: timeTaken,
            })
        }

        // 1. Try atomic database RPC first
        if (!serverResult) {
            try {
                const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_player_answer', {
                    p_match_id: matchId,
                    p_player_id: gameState?.playerId,
                    p_question_id: currentQuestion.id,
                    p_selected_answer_index: answerIndex,
                    p_time_taken_ms: timeTaken,
                })

                if (!rpcErr && rpcData && rpcData.success) {
                    serverResult = rpcData
                }
            } catch (rpcEx) {
                console.warn('Direct RPC submit failed, calling edge function:', rpcEx)
            }
        }

        // 2. Fallback to Edge Function
        if (!serverResult) {
            try {
                const { data: funcData, error: funcErr } = await supabase.functions.invoke('submit-answer', {
                    body: {
                        matchId,
                        playerId: gameState?.playerId,
                        questionId: currentQuestion.id,
                        selectedAnswerIndex: answerIndex,
                        timeTakenMs: timeTaken,
                    },
                })

                if (!funcErr && funcData?.success) {
                    serverResult = funcData
                }
            } catch (edgeEx) {
                console.error('Edge Function submit error:', edgeEx)
            }
        }

        const isAnsCorrect = Boolean(serverResult?.isCorrect)
        const verifiedCorrectIndex = serverResult?.correctAnswerIndex ?? 0
        const verifiedScore = serverResult?.score
        const verifiedExplanation = serverResult?.explanation || currentQuestion.explanation

        setIsCorrect(isAnsCorrect)
        setCorrectAnswerIndex(verifiedCorrectIndex)
        setShowFeedback(true)

        if (matchId?.startsWith('match-') && verifiedScore) {
            setMyScore((prev) => prev + (verifiedScore.totalPoints || 0))
            setMyStreak(verifiedScore.currentStreak || 0)
        }

        if (isAnsCorrect) {
            triggerHaptic([40, 40])
            playCorrect()
            const streak = verifiedScore?.currentStreak ?? (myStreak + 1)
            if (streak >= 2) playStreak()

            const totalPts = verifiedScore?.totalPoints ?? 100
            const streakBonusText = streak >= 2 ? ` • ${getStreakText(streak)}` : ''
            setFloatingScoreText(`+${totalPts} PTS${streakBonusText}`)
        } else {
            triggerHaptic([100, 50, 100])
            playIncorrect()
            setFloatingScoreText(answerIndex === -1 ? '⌛ TIME OUT' : '✗ INCORRECT')
        }

        // Update local explanation if provided
        if (verifiedExplanation) {
            setCurrentQuestion((prev) => prev ? { ...prev, explanation: verifiedExplanation } : null)
        }

        // Advance to next question or waiting room
        setTimeout(() => {
            if (serverResult?.matchComplete) {
                navigate(`/results/${matchId}`)
                return
            }

            const nextOrder = questionOrder + 1
            if (nextOrder <= totalQuestions) {
                loadQuestion(nextOrder)
                setSubmitting(false)
            } else {
                setWaitingForOpponent(true)
            }
        }, 2200)
    }

    const handleTimeout = useCallback(() => {
        if (selectedAnswer === null && !submitting && !waitingForOpponent) {
            handleAnswerSelect(-1)
        }
    }, [selectedAnswer, submitting, waitingForOpponent, handleAnswerSelect])

    const handleClaimForfeit = async () => {
        try {
            setLoading(true)
            if (matchId?.startsWith('match-')) {
                forfeitLocalMatch(matchId, gameState?.playerId || '')
                navigate(`/results/${matchId}`)
                return
            }
            await supabase.rpc('forfeit_match', {
                p_match_id: matchId,
                p_player_id: gameState?.playerId,
            })
            navigate(`/results/${matchId}`)
        } catch {
            navigate(`/results/${matchId}`)
        }
    }

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
                        <h2 className="text-3xl font-serif font-bold mb-3 text-gold-gradient">All Scrolls Answered!</h2>
                        <p className="text-parchment-muted font-body mb-4">
                            You've finished your questions. Waiting for <span className="text-gold-light font-serif font-bold">{opponentPlayerName}</span> to conclude...
                        </p>
                        
                        <div className="bg-wood-darker p-4 rounded-xl text-xs font-serif text-gold border border-gold/30 mb-6">
                            📜 Live scores update in real-time. Redirecting to victory results automatically!
                        </div>

                        {/* Forfeit and Emergency Exit Controls */}
                        <div className="pt-4 border-t border-gold/20 flex flex-col items-center gap-3">
                            <p className="text-xs font-serif text-parchment-muted">
                                {forfeitCountdown > 0
                                    ? `Opponent grace period: ${forfeitCountdown}s remaining`
                                    : 'Opponent inactive. You may conclude the match now.'}
                            </p>
                            <button
                                onClick={handleClaimForfeit}
                                className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
                            >
                                ⚡ Conclude Duel & View Results
                            </button>
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
                <div className="flex items-center justify-between mb-3 font-serif">
                    <div className="text-xs md:text-sm text-parchment-muted tracking-wider uppercase flex items-center gap-2">
                        <span>Scroll {questionOrder} of {totalQuestions}</span>
                        {opponentAnsweredCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold-light border border-gold/40 text-[10px] animate-pulse font-bold">
                                ⚡ Opponent Locked In!
                            </span>
                        )}
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

                {/* Step Progress Pin Track */}
                <BattleProgressBar
                    totalQuestions={totalQuestions}
                    currentQuestionOrder={questionOrder}
                    opponentQuestionOrder={opponentQuestionOrder}
                    opponentAnsweredCurrent={opponentAnsweredCurrent}
                    player1Avatar={getPlayerAvatar(myPlayerName)}
                    player2Avatar={getPlayerAvatar(opponentPlayerName)}
                    player1Name={myPlayerName}
                    player2Name={opponentPlayerName}
                />

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
                <div className={`card-parchment mb-6 animate-scale-in transition-all duration-300 relative ${
                    showFeedback ? (isCorrect ? 'border-forest/60 ring-2 ring-forest/30' : 'border-burgundy/60 ring-2 ring-burgundy/30') : ''
                }`}>
                    {/* Floating Score Combat Text Popups */}
                    {floatingScoreText && (
                        <div className={`absolute top-3 right-4 px-3 py-1 rounded-full text-xs font-serif font-bold shadow-lg animate-bounce z-20 ${
                            isCorrect ? 'bg-forest text-parchment border border-emerald-400' : 'bg-burgundy text-parchment border border-rose-400'
                        }`}>
                            {floatingScoreText}
                        </div>
                    )}

                    <div className="inline-block px-3 py-1 bg-parchment-dark/70 text-parchment-muted rounded-full text-xs font-serif font-semibold tracking-wider uppercase mb-4 border border-parchment-border">
                        {currentQuestion.topic} • {currentQuestion.difficulty}
                    </div>
                    <h2 className="text-lg sm:text-2xl md:text-3xl font-serif font-bold mb-4 sm:mb-8 text-center text-parchment-text leading-snug">
                        {decodeHtmlEntities(currentQuestion.question_text)}
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
                                    id={`arena-option-${index}`}
                                    onClick={() => handleAnswerSelect(index)}
                                    disabled={submitting || showFeedback}
                                    className={buttonClass}
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="w-8 h-8 rounded-lg bg-wood-medium border border-gold/40 text-gold flex items-center justify-center font-serif font-bold text-sm flex-shrink-0 shadow-sm">
                                            {String.fromCharCode(65 + index)}
                                        </div>
                                        <div className="flex-1 text-left font-body text-sm sm:text-base">
                                            {decodeHtmlEntities(option)}
                                        </div>
                                        {showFeedback && isThisCorrect && <span className="text-forest font-bold text-base">✓</span>}
                                        {showFeedback && isThisWrong && <span className="text-burgundy font-bold text-base">✗</span>}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* Feedback Explanation */}
                    {showFeedback && (
                        <div className="mt-6 animate-slide-up">
                            <div
                                className={`p-4 rounded-xl border-2 ${
                                    isCorrect
                                        ? 'bg-forest/10 border-forest text-forest'
                                        : 'bg-burgundy/10 border-burgundy text-burgundy'
                                }`}
                            >
                                <div className="font-serif font-bold text-base mb-1">
                                    {isCorrect ? '✓ Excellent! Correct Answer.' : '✗ Incorrect Choice'}
                                </div>
                                {currentQuestion.explanation && (
                                    <div className="text-xs font-body text-parchment-muted leading-relaxed">
                                        {decodeHtmlEntities(currentQuestion.explanation)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Streak multiplier indicator */}
                {myStreak > 0 && !showFeedback && (
                    <div className="text-center font-serif text-gold font-bold animate-pulse text-sm">
                        🪙 {getStreakText(myStreak)} Streak Multiplier Active!
                    </div>
                )}
            </div>
        </div>
    )
}
