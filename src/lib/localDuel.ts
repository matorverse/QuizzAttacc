// Local Tavern Duel Manager using BroadcastChannel & localStorage
// Enables 1v1 duels across multiple browser tabs with zero server dependencies or when remote cloud is offline

import { getOfflineQuestions, OfflineQuestion } from './offlineQuestions'

export interface LocalPlayer {
    id: string
    display_name: string
}

export interface LocalRoom {
    id: string
    code: string
    host_id: string
    topic: string
    difficulty: string
    question_count: number
    time_per_question: number
    created_at: string
}

export interface LocalMatch {
    id: string
    room_id: string
    player1_id: string
    player2_id?: string
    player1_name: string
    player2_name?: string
    status: 'waiting' | 'active' | 'finished' | 'abandoned'
    questions: OfflineQuestion[]
    p1_scores: Record<string, any>
    p2_scores: Record<string, any>
    p1_answers: Record<string, any>
    p2_answers: Record<string, any>
    started_at?: string
    finished_at?: string
}

const DUEL_CHANNEL_NAME = 'quizzattacc_duel_sync'

let duelBroadcastChannel: BroadcastChannel | null = null

export function getDuelChannel(): BroadcastChannel | null {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null
    if (!duelBroadcastChannel) {
        duelBroadcastChannel = new BroadcastChannel(DUEL_CHANNEL_NAME)
    }
    return duelBroadcastChannel
}

export function broadcastDuelEvent(matchId: string, event: string, payload: any) {
    const channel = getDuelChannel()
    if (channel) {
        channel.postMessage({ matchId, event, payload, timestamp: Date.now() })
    }
}

export function subscribeDuelEvents(matchId: string, callback: (event: string, payload: any) => void): () => void {
    const channel = getDuelChannel()
    if (!channel) return () => {}

    const handler = (msgEvt: MessageEvent) => {
        const data = msgEvt.data
        if (data && data.matchId === matchId) {
            callback(data.event, data.payload)
        }
    }

    channel.addEventListener('message', handler)
    return () => {
        channel.removeEventListener('message', handler)
    }
}

// Local Room Creation
export function createLocalDuel(formData: {
    displayName: string
    topic: string
    difficulty: string
    questionCount: number
    timePerQuestion: number
}) {
    const playerId = 'local-p1-' + Math.random().toString(36).substring(2, 9)
    const roomId = 'room-' + Math.random().toString(36).substring(2, 9)
    const matchId = 'match-' + Math.random().toString(36).substring(2, 9)

    // Generate unique 6-character room code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let roomCode = ''
    for (let i = 0; i < 6; i++) {
        roomCode += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    const questions = getOfflineQuestions(formData.topic, formData.difficulty, formData.questionCount)

    const room: LocalRoom = {
        id: roomId,
        code: roomCode,
        host_id: playerId,
        topic: formData.topic,
        difficulty: formData.difficulty,
        question_count: formData.questionCount,
        time_per_question: formData.timePerQuestion,
        created_at: new Date().toISOString(),
    }

    const match: LocalMatch = {
        id: matchId,
        room_id: roomId,
        player1_id: playerId,
        player1_name: formData.displayName,
        status: 'waiting',
        questions,
        p1_scores: {},
        p2_scores: {},
        p1_answers: {},
        p2_answers: {},
    }

    localStorage.setItem(`quizzattacc_room_${roomCode}`, JSON.stringify(room))
    localStorage.setItem(`quizzattacc_match_${matchId}`, JSON.stringify(match))
    localStorage.setItem(`quizzattacc_room_to_match_${roomCode}`, matchId)

    return {
        success: true,
        roomCode,
        matchId,
        playerId,
        roomSettings: {
            topic: formData.topic,
            difficulty: formData.difficulty,
            questionCount: formData.questionCount,
            timePerQuestion: formData.timePerQuestion,
        },
    }
}

// Local Room Joining
export function joinLocalDuel(displayName: string, rawCode: string) {
    const cleanCode = rawCode.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    const matchId = localStorage.getItem(`quizzattacc_room_to_match_${cleanCode}`)

    if (!matchId) {
        throw new Error('Table not found in Tavern. Please check your room code.')
    }

    const matchStr = localStorage.getItem(`quizzattacc_match_${matchId}`)
    if (!matchStr) {
        throw new Error('Match instance not found.')
    }

    const match: LocalMatch = JSON.parse(matchStr)

    if (match.status !== 'waiting') {
        throw new Error(`Cannot join: match is already ${match.status}.`)
    }

    const playerId = 'local-p2-' + Math.random().toString(36).substring(2, 9)
    match.player2_id = playerId
    match.player2_name = displayName
    match.status = 'active'
    match.started_at = new Date().toISOString()

    localStorage.setItem(`quizzattacc_match_${matchId}`, JSON.stringify(match))

    // Broadcast instant player joined notification to host tab
    broadcastDuelEvent(matchId, 'PLAYER_JOINED', {
        matchId,
        player2Id: playerId,
        player2Name: displayName,
    })

    return {
        success: true,
        matchId,
        playerId,
        opponent: {
            id: match.player1_id,
            displayName: match.player1_name,
        },
        roomSettings: {
            topic: match.questions[0]?.topic || 'General Knowledge',
            difficulty: match.questions[0]?.difficulty || 'medium',
            questionCount: match.questions.length,
            timePerQuestion: 15,
        },
    }
}

// Retrieve local match questions (zero-knowledge: correct_answer_index stripped)
export function getLocalPublicQuestions(matchId: string) {
    const matchStr = localStorage.getItem(`quizzattacc_match_${matchId}`)
    if (!matchStr) return []

    const match: LocalMatch = JSON.parse(matchStr)
    return match.questions.map((q, index) => ({
        question_order: index + 1,
        question_id: q.id,
        questions: {
            id: q.id,
            topic: q.topic,
            difficulty: q.difficulty,
            question_text: q.question_text,
            options: q.options,
        },
    }))
}

// Retrieve local match metadata
export function getLocalMatch(matchId: string): LocalMatch | null {
    const matchStr = localStorage.getItem(`quizzattacc_match_${matchId}`)
    return matchStr ? JSON.parse(matchStr) : null
}

// Local Answer Submission & Server-Authoritative Emulation
export function submitLocalAnswer(params: {
    matchId: string
    playerId: string
    questionId: string
    selectedAnswerIndex: number
    timeTakenMs: number
}) {
    const matchStr = localStorage.getItem(`quizzattacc_match_${params.matchId}`)
    if (!matchStr) throw new Error('Match not found')

    const match: LocalMatch = JSON.parse(matchStr)
    const isPlayer1 = params.playerId === match.player1_id
    const isPlayer2 = params.playerId === match.player2_id

    if (!isPlayer1 && !isPlayer2) {
        throw new Error('Player not in this match')
    }

    const question = match.questions.find((q) => q.id === params.questionId)
    if (!question) throw new Error('Question not found')

    const isCorrect = params.selectedAnswerIndex >= 0 && params.selectedAnswerIndex === question.correct_answer_index

    // Scoring calculation
    let basePoints = 0
    let timeBonus = 0
    let streakMultiplier = 1.0
    let currentStreak = 0

    const playerScores = isPlayer1 ? match.p1_scores : match.p2_scores

    if (isCorrect) {
        basePoints = 100
        const timeLimitMs = 15000
        const clampedTime = Math.max(0, Math.min(params.timeTakenMs, timeLimitMs))
        const timeBonusRatio = Math.max(0, (timeLimitMs - clampedTime) / timeLimitMs)
        timeBonus = Math.round(timeBonusRatio * 50)

        // Previous streak count
        let lastStreak = 0
        const scoreKeys = Object.keys(playerScores)
        if (scoreKeys.length > 0) {
            const lastScore = playerScores[scoreKeys[scoreKeys.length - 1]]
            if (lastScore) lastStreak = lastScore.currentStreak || 0
        }
        currentStreak = lastStreak + 1

        if (currentStreak === 1) streakMultiplier = 1.0
        else if (currentStreak === 2) streakMultiplier = 1.1
        else streakMultiplier = 1.3
    } else {
        currentStreak = 0
    }

    const totalPoints = isCorrect ? Math.round((basePoints + timeBonus) * streakMultiplier) : 0

    const scoreEntry = {
        basePoints,
        timeBonus,
        streakMultiplier,
        totalPoints,
        currentStreak,
    }

    const answerEntry = {
        questionId: params.questionId,
        selectedAnswerIndex: params.selectedAnswerIndex,
        isCorrect,
        timeTakenMs: params.timeTakenMs,
        submittedAt: new Date().toISOString(),
    }

    if (isPlayer1) {
        match.p1_scores[params.questionId] = scoreEntry
        match.p1_answers[params.questionId] = answerEntry
    } else {
        match.p2_scores[params.questionId] = scoreEntry
        match.p2_answers[params.questionId] = answerEntry
    }

    // Check if both players answered all questions
    const qCount = match.questions.length
    const p1Done = Object.keys(match.p1_answers).length >= qCount
    const p2Done = Object.keys(match.p2_answers).length >= qCount
    let matchComplete = false

    if (p1Done && p2Done) {
        match.status = 'finished'
        match.finished_at = new Date().toISOString()
        matchComplete = true
    }

    localStorage.setItem(`quizzattacc_match_${params.matchId}`, JSON.stringify(match))

    // Broadcast score and answered event to opponent tab
    broadcastDuelEvent(params.matchId, 'SCORE_UPDATED', {
        playerId: params.playerId,
        totalPoints,
        currentStreak,
        questionId: params.questionId,
    })

    if (matchComplete) {
        broadcastDuelEvent(params.matchId, 'MATCH_FINISHED', { matchId: params.matchId })
    }

    return {
        success: true,
        isCorrect,
        correctAnswerIndex: question.correct_answer_index,
        explanation: question.explanation,
        score: scoreEntry,
        matchComplete,
    }
}

// Forfeit local match
export function forfeitLocalMatch(matchId: string, playerId: string) {
    const matchStr = localStorage.getItem(`quizzattacc_match_${matchId}`)
    if (!matchStr) return { success: false }

    const match: LocalMatch = JSON.parse(matchStr)
    match.status = 'finished'
    match.finished_at = new Date().toISOString()
    localStorage.setItem(`quizzattacc_match_${matchId}`, JSON.stringify(match))

    broadcastDuelEvent(matchId, 'MATCH_FINISHED', { matchId, forfeitedBy: playerId })
    return { success: true }
}
