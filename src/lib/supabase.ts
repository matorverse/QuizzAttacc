import { createClient } from '@supabase/supabase-js'

// Add simple type definition for Vite's import.meta.env to satisfy tsc
declare global {
    interface ImportMeta {
        env: {
            VITE_SUPABASE_URL: string;
            VITE_SUPABASE_ANON_KEY: string;
        }
    }
}

const envUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zssiwfkljhwyzjeawdix.supabase.co'
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DHpnRTVaHb92Xnb9xquwTA_NfLOXCgG'

const supabaseUrl = envUrl && envUrl.startsWith('http') ? envUrl : 'https://zssiwfkljhwyzjeawdix.supabase.co'
const supabaseAnonKey = envKey && envKey !== 'your_supabase_anon_key' ? envKey : 'sb_publishable_DHpnRTVaHb92Xnb9xquwTA_NfLOXCgG'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
})


// Database types
export interface Player {
    id: string
    display_name: string
    auth_id?: string
    created_at: string
    updated_at: string
}

export interface Room {
    id: string
    code: string
    host_id: string
    topic: string
    difficulty: 'easy' | 'medium' | 'hard'
    question_count: number
    time_per_question: number
    expires_at: string
    created_at: string
}

export interface Match {
    id: string
    room_id: string
    player1_id: string
    player2_id?: string
    status: 'waiting' | 'active' | 'finished' | 'abandoned'
    started_at?: string
    finished_at?: string
    created_at: string
    updated_at: string
}

export interface Question {
    id: string
    topic: string
    difficulty: 'easy' | 'medium' | 'hard'
    question_text: string
    options: string[]
    correct_answer_index: number
    explanation?: string
    created_at: string
}

export interface MatchQuestion {
    id: string
    match_id: string
    question_id: string
    question_order: number
    started_at?: string
    created_at: string
}

export interface PlayerAnswer {
    id: string
    match_id: string
    player_id: string
    question_id: string
    selected_answer_index: number
    is_correct: boolean
    time_taken_ms: number
    submitted_at: string
    created_at: string
}

export interface MatchScore {
    id: string
    match_id: string
    player_id: string
    question_id: string
    base_points: number
    time_bonus: number
    streak_multiplier: number
    total_points: number
    current_streak: number
    created_at: string
}

export interface MatchSummary {
    id: string
    match_id: string
    winner_id?: string
    player1_id: string
    player2_id: string
    player1_score: number
    player2_score: number
    player1_accuracy: number
    player2_accuracy: number
    player1_avg_time_ms: number
    player2_avg_time_ms: number
    total_duration_seconds: number
    created_at: string
}
