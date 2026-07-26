import { memo } from 'react'

interface BattleProgressBarProps {
    totalQuestions: number
    currentQuestionOrder: number
    opponentQuestionOrder: number
    opponentAnsweredCurrent: boolean
    player1Avatar: string
    player2Avatar: string
    player1Name: string
    player2Name: string
}

function BattleProgressBar({
    totalQuestions,
    currentQuestionOrder,
    opponentQuestionOrder,
    opponentAnsweredCurrent,
    player1Avatar,
    player2Avatar,
    player1Name,
    player2Name,
}: BattleProgressBarProps) {
    const questions = Array.from({ length: totalQuestions }, (_, i) => i + 1)

    return (
        <div className="bg-wood-dark border border-gold/30 rounded-xl p-2.5 sm:p-3 mb-4 shadow-md">
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-serif mb-2 text-parchment-muted">
                <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-gold inline-block"></span>
                    <span className="font-bold text-gold-light truncate">{player1Name}</span> (You)
                </div>
                <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-gold truncate">{player2Name}</span>
                    <span className="w-2 h-2 rounded-full bg-wood-light inline-block"></span>
                </div>
            </div>

            {/* Step Progress Pins Track */}
            <div className="relative flex items-center justify-between gap-1 sm:gap-1.5 px-1">
                {questions.map((qNum) => {
                    const isMyCurrent = currentQuestionOrder === qNum
                    const isMyCompleted = currentQuestionOrder > qNum
                    const isOpponentCurrent = opponentQuestionOrder === qNum

                    return (
                        <div
                            key={qNum}
                            className={`relative flex-1 h-6 sm:h-7 rounded-lg flex items-center justify-center font-serif text-[10px] sm:text-xs font-bold transition-all duration-300 border ${
                                isMyCurrent
                                    ? 'bg-wood-medium border-gold text-gold shadow-sm ring-1 ring-gold/40'
                                    : isMyCompleted
                                    ? 'bg-parchment-dark/60 border-parchment-border text-parchment-text'
                                    : 'bg-wood-darker/80 border-wood-light/20 text-parchment-muted/50'
                            }`}
                        >
                            <span>Q{qNum}</span>

                            {/* Player 1 Pin (Bottom) */}
                            {isMyCurrent && (
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-gold border border-wood-darker rounded-full flex items-center justify-center text-[8px] font-bold text-wood-darker shadow-sm animate-bounce">
                                    {player1Avatar}
                                </div>
                            )}

                            {/* Player 2 Pin (Top) */}
                            {isOpponentCurrent && (
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-wood-light border border-gold rounded-full flex items-center justify-center text-[8px] font-bold text-gold shadow-sm">
                                    {player2Avatar}
                                </div>
                            )}

                            {/* Opponent Answered Indicator for Active Question */}
                            {isMyCurrent && opponentAnsweredCurrent && (
                                <div className="absolute -top-2 -right-1 text-[10px] animate-ping" title="Opponent Locked In!">
                                    ⚡
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default memo(BattleProgressBar)
