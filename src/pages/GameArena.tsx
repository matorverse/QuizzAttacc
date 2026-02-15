import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, Question, MatchScore } from '../lib/supabase'
import { loadGameState, saveGameState, getStreakText } from '../lib/gameLogic'
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
    const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())

    const [myScore, setMyScore] = useState(0)
    const [opponentScore, setOpponentScore] = useState(0)
    const [myStreak, setMyStreak] = useState(0)
    const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected')

    const gameState = loadGameState()

    useEffect(() => {
        if (!matchId || !gameState) {
            navigate('/')
            return
        }

        loadQuestion(questionOrder)
        subscribeToScores()
    }, [matchId])

    const loadQuestion = async (order: number) => {
        try {
            // Get match question
            const { data: matchQuestion, error: mqError } = await supabase
                .from('match_questions')
                .select('question_id, questions(*)')
                .eq('match_id', matchId!)
                .eq('question_order', order)
                .single()

            if (mqError) throw mqError

            // @ts-ignore
            setCurrentQuestion(matchQuestion.questions)
            setQuestionOrder(order)
            setQuestionStartTime(Date.now())
            setSelectedAnswer(null)
            setIsCorrect(null)
            setCorrectAnswerIndex(null)
            setShowFeedback(false)
            setLoading(false)
        } catch (error) {
            console.error('Error loading question:', error)
        }
    }

    const subscribeToScores = () => {
        const channel = supabase
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
                    if (score.player_id === gameState?.playerId) {
                        setMyScore((prev) => prev + score.total_points)
                        setMyStreak(score.current_streak)
                    } else {
                        setOpponentScore((prev) => prev + score.total_points)
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

        return () => {
            channel.unsubscribe()
        }
    }

    const handleAnswerSelect = async (answerIndex: number) => {
        if (submitting || selectedAnswer !== null) return

        setSelectedAnswer(answerIndex)
        setSubmitting(true)

        const timeTaken = Date.now() - questionStartTime

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

            if (error) throw error
            if (!data.success) throw new Error(data.error)

            setIsCorrect(data.isCorrect)
            setCorrectAnswerIndex(data.correctAnswerIndex)
            setShowFeedback(true)

            // Wait 2 seconds to show feedback
            setTimeout(() => {
                if (data.matchComplete) {
                    navigate(`/results/${matchId}`)
                } else {
                    // Load next question
                    const nextOrder = questionOrder + 1
                    if (nextOrder <= totalQuestions) {
                        loadQuestion(nextOrder)
                        setSubmitting(false)
                    }
                }
            }, 2500)
        } catch (error: any) {
            console.error('Error submitting answer:', error)
            alert(error.message || 'Failed to submit answer')
            setSubmitting(false)
            setSelectedAnswer(null)
        }
    }

    const handleTimeout = () => {
        if (selectedAnswer === null && !submitting) {
            // Auto-submit with invalid answer
            handleAnswerSelect(-1)
        }
    }

    if (loading || !currentQuestion) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyber-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading question...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="text-sm text-gray-400">
                        Question {questionOrder} of {totalQuestions}
                    </div>
                    <ConnectionStatus state={connectionState} />
                </div>

                {/* Scoreboard */}
                <ScoreBoard
                    player1Name={gameState?.playerId === gameState?.playerId ? 'You' : 'Opponent'}
                    player2Name="Opponent"
                    player1Score={myScore}
                    player2Score={opponentScore}
                    player1Streak={myStreak}
                    player2Streak={0}
                />

                {/* Timer */}
                <div className="flex justify-center mb-8">
                    <Timer
                        duration={timePerQuestion}
                        onTimeout={handleTimeout}
                        paused={showFeedback}
                    />
                </div>

                {/* Question */}
                <div className="card mb-6 animate-scale-in">
                    <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
                        {currentQuestion.question_text}
                    </h2>

                    {/* Answers */}
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
                                        <div className="w-8 h-8 rounded-full bg-cyber-blue/20 flex items-center justify-center font-bold flex-shrink-0">
                                            {String.fromCharCode(65 + index)}
                                        </div>
                                        <div className="flex-1 text-left">{option}</div>
                                        {showFeedback && isThisCorrect && <span>✓</span>}
                                        {showFeedback && isThisWrong && <span>✗</span>}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* Feedback */}
                    {showFeedback && (
                        <div className="mt-6 animate-slide-up">
                            <div
                                className={`p-4 rounded-lg border-2 ${isCorrect
                                        ? 'bg-cyber-green/10 border-cyber-green text-cyber-green'
                                        : 'bg-cyber-red/10 border-cyber-red text-cyber-red'
                                    }`}
                            >
                                <div className="font-bold text-lg mb-1">
                                    {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                                </div>
                                {currentQuestion.explanation && (
                                    <div className="text-sm text-gray-300">{currentQuestion.explanation}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Streak indicator */}
                {myStreak > 0 && !showFeedback && (
                    <div className="text-center text-cyber-blue font-bold animate-pulse">
                        {getStreakText(myStreak)} Streak!
                    </div>
                )}
            </div>
        </div>
    )
}
