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
        <div className="glass rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
                {/* Player 1 */}
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyber-blue to-cyber-purple rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {getPlayerAvatar(player1Name)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{player1Name}</div>
                        <div className="text-2xl font-bold text-cyber-blue">
                            {formatScore(player1Score)}
                        </div>
                        {player1Streak > 0 && (
                            <div className="text-xs text-cyber-blue">{getStreakText(player1Streak)}</div>
                        )}
                    </div>
                </div>

                {/* Player 2 */}
                <div className="flex items-center gap-3 flex-row-reverse">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyber-purple to-cyber-pink rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {getPlayerAvatar(player2Name)}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                        <div className="font-semibold truncate">{player2Name}</div>
                        <div className="text-2xl font-bold text-cyber-purple">
                            {formatScore(player2Score)}
                        </div>
                        {player2Streak > 0 && (
                            <div className="text-xs text-cyber-purple">{getStreakText(player2Streak)}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
