import { memo } from 'react'
import { getPlayerAvatar, getStreakText, formatScore } from '../lib/gameLogic'

interface ScoreBoardProps {
    player1Name: string
    player2Name: string
    player1Score: number
    player2Score: number
    player1Streak: number
    player2Streak: number
}

function ScoreBoard({
    player1Name,
    player2Name,
    player1Score,
    player2Score,
    player1Streak,
    player2Streak,
}: ScoreBoardProps) {
    const scoreDiff = player1Score - player2Score
    let leadBadge = '🤝 TIED MATCH'
    let leadClass = 'border-gold/30 text-parchment-muted'
    if (scoreDiff > 0) {
        leadBadge = `👑 LEADING BY +${scoreDiff.toLocaleString()} PTS`
        leadClass = 'border-gold/60 text-gold-light bg-gold/10'
    } else if (scoreDiff < 0) {
        leadBadge = `🗡️ TRAILING BY ${Math.abs(scoreDiff).toLocaleString()} PTS`
        leadClass = 'border-parchment-border/40 text-parchment-muted bg-wood-darker/40'
    }

    return (
        <div className="bg-wood-dark border-2 border-gold/40 rounded-2xl p-2.5 sm:p-4 md:p-5 mb-4 sm:mb-6 shadow-xl">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {/* Player 1 */}
                <div className="flex items-center gap-2 sm:gap-3 bg-wood-medium/60 p-2 sm:p-3 rounded-xl border border-wood-light/40 min-w-0">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-gold to-gold-dark text-wood-darker border-2 border-gold-light rounded-full flex items-center justify-center font-serif font-bold text-sm sm:text-lg flex-shrink-0 shadow-md">
                        {getPlayerAvatar(player1Name)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-serif font-bold text-parchment truncate text-xs sm:text-sm md:text-base">{player1Name}</div>
                        <div className="text-base sm:text-xl md:text-2xl font-serif font-bold text-gold-light tracking-wide truncate">
                            {formatScore(player1Score)}
                        </div>
                        {player1Streak > 0 && (
                            <div className="text-[10px] sm:text-xs font-serif text-gold flex items-center gap-1 truncate">
                                {getStreakText(player1Streak)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Player 2 */}
                <div className="flex items-center gap-2 sm:gap-3 flex-row-reverse bg-wood-medium/60 p-2 sm:p-3 rounded-xl border border-wood-light/40 min-w-0">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-wood-light to-wood-medium text-gold border-2 border-gold/50 rounded-full flex items-center justify-center font-serif font-bold text-sm sm:text-lg flex-shrink-0 shadow-md">
                        {getPlayerAvatar(player2Name)}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                        <div className="font-serif font-bold text-parchment truncate text-xs sm:text-sm md:text-base">{player2Name}</div>
                        <div className="text-base sm:text-xl md:text-2xl font-serif font-bold text-gold tracking-wide truncate">
                            {formatScore(player2Score)}
                        </div>
                        {player2Streak > 0 && (
                            <div className="text-[10px] sm:text-xs font-serif text-gold flex items-center justify-end gap-1 truncate">
                                {getStreakText(player2Streak)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Score Lead Margin Banner */}
            <div className="mt-2.5 pt-2 border-t border-gold/20 flex items-center justify-center">
                <div className={`px-3 py-0.5 rounded-full border text-[10px] sm:text-xs font-serif font-bold tracking-wider uppercase ${leadClass}`}>
                    {leadBadge}
                </div>
            </div>
        </div>
    )
}

export default memo(ScoreBoard)
