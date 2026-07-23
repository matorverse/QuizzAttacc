import { getPlayerAvatar, getStreakText, formatScore } from '../lib/gameLogic'

interface ScoreBoardProps {
    player1Name: string
    player2Name: string
    player1Score: number
    player2Score: number
    player1Streak: number
    player2Streak: number
}

export default function ScoreBoard({
    player1Name,
    player2Name,
    player1Score,
    player2Score,
    player1Streak,
    player2Streak,
}: ScoreBoardProps) {
    return (
        <div className="bg-wood-dark border-2 border-gold/40 rounded-2xl p-4 md:p-5 mb-6 shadow-xl">
            <div className="grid grid-cols-2 gap-4">
                {/* Player 1 */}
                <div className="flex items-center gap-3 bg-wood-medium/60 p-3 rounded-xl border border-wood-light/40">
                    <div className="w-12 h-12 bg-gradient-to-br from-gold to-gold-dark text-wood-darker border-2 border-gold-light rounded-full flex items-center justify-center font-serif font-bold text-lg flex-shrink-0 shadow-md">
                        {getPlayerAvatar(player1Name)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-serif font-bold text-parchment truncate text-sm md:text-base">{player1Name}</div>
                        <div className="text-xl md:text-2xl font-serif font-bold text-gold-light tracking-wide">
                            {formatScore(player1Score)}
                        </div>
                        {player1Streak > 0 && (
                            <div className="text-xs font-serif text-gold flex items-center gap-1">
                                {getStreakText(player1Streak)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Player 2 */}
                <div className="flex items-center gap-3 flex-row-reverse bg-wood-medium/60 p-3 rounded-xl border border-wood-light/40">
                    <div className="w-12 h-12 bg-gradient-to-br from-wood-light to-wood-medium text-gold border-2 border-gold/50 rounded-full flex items-center justify-center font-serif font-bold text-lg flex-shrink-0 shadow-md">
                        {getPlayerAvatar(player2Name)}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                        <div className="font-serif font-bold text-parchment truncate text-sm md:text-base">{player2Name}</div>
                        <div className="text-xl md:text-2xl font-serif font-bold text-gold tracking-wide">
                            {formatScore(player2Score)}
                        </div>
                        {player2Streak > 0 && (
                            <div className="text-xs font-serif text-gold flex items-center justify-end gap-1">
                                {getStreakText(player2Streak)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
