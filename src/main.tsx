import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

// Pages
import Home from './pages/Home'
import CreateRoom from './pages/CreateRoom'
import JoinRoom from './pages/JoinRoom'
import GameArena from './pages/GameArena'
import Results from './pages/Results'

const envUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zssiwfkljhwyzjeawdix.supabase.co'
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DHpnRTVaHb92Xnb9xquwTA_NfLOXCgG'

const hasConfig = Boolean(
    envUrl &&
    envKey &&
    envUrl.startsWith('http') &&
    envUrl !== 'your_supabase_project_url' &&
    envKey !== 'your_supabase_anon_key'
)

const ConfigError = () => (
    <div className="min-h-screen bg-wood-darker text-parchment flex items-center justify-center p-4">
        <div className="card-parchment max-w-lg w-full text-center space-y-6">
            <h1 className="text-3xl font-serif font-bold text-burgundy">Missing Configuration</h1>
            <p className="font-body text-parchment-text">
                The application cannot start because the Supabase environment variables are missing.
            </p>
            <div className="wood-panel p-4 rounded-xl text-left font-mono text-xs text-gold border border-gold/30">
                <p># Create a .env file or add Vercel Environment Variables with:</p>
                <p>VITE_SUPABASE_URL=https://zssiwfkljhwyzjeawdix.supabase.co</p>
                <p>VITE_SUPABASE_ANON_KEY=sb_publishable_DHpnRTVaHb92Xnb9xquwTA_NfLOXCgG</p>
            </div>
        </div>
    </div>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {hasConfig ? (
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/create" element={<CreateRoom />} />
                    <Route path="/join" element={<JoinRoom />} />
                    <Route path="/game/:matchId" element={<GameArena />} />
                    <Route path="/results/:matchId" element={<Results />} />
                </Routes>
            </BrowserRouter>
        ) : (
            <ConfigError />
        )}
    </React.StrictMode>,
)
