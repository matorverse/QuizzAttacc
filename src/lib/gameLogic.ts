// Game state management and utility functions for QuizzAttacc

export interface GameState {
    matchId: string
    playerId: string
    opponentId: string
    currentQuestionOrder: number
    totalQuestions: number
    timePerQuestion: number
    topic: string
    difficulty: string
}

export const saveGameState = (state: GameState) => {
    localStorage.setItem('quizexe_game_state', JSON.stringify(state))
    // Also save persistent player ID so results and rematches survive state resets
    if (state.playerId) {
        localStorage.setItem('quizexe_persistent_player_id', state.playerId)
    }
}

export const loadGameState = (): GameState | null => {
    const saved = localStorage.getItem('quizexe_game_state')
    return saved ? JSON.parse(saved) : null
}

export const getPersistentPlayerId = (): string | null => {
    return localStorage.getItem('quizexe_persistent_player_id')
}

export const clearGameState = () => {
    localStorage.removeItem('quizexe_game_state')
}

// Robust HTML entity decoder for OpenTDB trivia questions
export const decodeHtmlEntities = (text: string): string => {
    if (!text) return ''
    return text
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&deg;/g, '°')
        .replace(/&eacute;/g, 'é')
        .replace(/&egrave;/g, 'è')
        .replace(/&aacute;/g, 'á')
        .replace(/&ntilde;/g, 'ñ')
        .replace(/&oacute;/g, 'ó')
        .replace(/&uuml;/g, 'ü')
        .replace(/&ouml;/g, 'ö')
        .replace(/&auml;/g, 'ä')
        .replace(/&shy;/g, '')
        .replace(/&hellip;/g, '…')
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&rdquo;/g, '"')
        .replace(/&ldquo;/g, '"')
        .replace(/&ndash;/g, '–')
        .replace(/&mdash;/g, '—')
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
}

// Timer utilities
export const formatTime = (seconds: number): string => {
    return seconds.toString().padStart(2, '0')
}

export const getTimerColor = (remainingSeconds: number, totalSeconds: number): string => {
    const percentage = (remainingSeconds / totalSeconds) * 100
    if (percentage > 50) return 'text-gold'
    if (percentage > 25) return 'text-amber-500'
    return 'text-burgundy-DEFAULT'
}

// Score formatting
export const formatScore = (score: number): string => {
    return score.toLocaleString()
}

export const getStreakText = (streak: number): string => {
    if (streak === 0) return ''
    if (streak === 1) return '1x'
    if (streak === 2) return '1.1x 🪙'
    return '1.3x 🪙🪙'
}

// Connection state
export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected'

export const getConnectionColor = (state: ConnectionState): string => {
    switch (state) {
        case 'connected':
            return 'bg-forest'
        case 'reconnecting':
            return 'bg-amber-500'
        case 'disconnected':
            return 'bg-burgundy'
    }
}

export const getConnectionText = (state: ConnectionState): string => {
    switch (state) {
        case 'connected':
            return 'Connected'
        case 'reconnecting':
            return 'Reconnecting...'
        case 'disconnected':
            return 'Disconnected'
    }
}

// Room code formatting
export const formatRoomCode = (code: string): string => {
    const cleaned = code.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    if (cleaned.length <= 3) return cleaned
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}`
}

export const parseRoomCode = (formatted: string): string => {
    return formatted.replace(/[^A-Z0-9]/gi, '').toUpperCase()
}

// Answer feedback
export const getAnswerFeedbackClass = (isCorrect: boolean): string => {
    return isCorrect
        ? 'bg-forest/20 border-forest text-forest animate-pulse-slow'
        : 'bg-burgundy/20 border-burgundy text-burgundy animate-pulse-slow'
}

// Difficulty badge colors
export const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
        case 'easy':
            return 'bg-forest/20 text-forest border-forest/60'
        case 'medium':
            return 'bg-amber-500/20 text-amber-700 border-amber-500/60'
        case 'hard':
            return 'bg-burgundy/20 text-burgundy border-burgundy/60'
        default:
            return 'bg-gold/20 text-gold-dark border-gold/60'
    }
}

// Generate player avatar from initials
export const getPlayerAvatar = (displayName: string): string => {
    const initials = displayName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    return initials || displayName.slice(0, 2).toUpperCase()
}

// Calculate progress percentage
export const calculateProgress = (current: number, total: number): number => {
    return Math.round((current / total) * 100)
}
