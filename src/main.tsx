import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

// Lazy loaded page components for optimal bundle splitting
const Home = lazy(() => import('./pages/Home'))
const CreateRoom = lazy(() => import('./pages/CreateRoom'))
const JoinRoom = lazy(() => import('./pages/JoinRoom'))
const GameArena = lazy(() => import('./pages/GameArena'))
const Results = lazy(() => import('./pages/Results'))

const envUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zssiwfkljhwyzjeawdix.supabase.co'
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DHpnRTVaHb92Xnb9xquwTA_NfLOXCgG'

const hasConfig = Boolean(
    envUrl &&
    envKey &&
    envUrl.startsWith('http') &&
    envUrl !== 'your_supabase_project_url' &&
    envKey !== 'your_supabase_anon_key'
)

const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-wood-darker">
        <div className="text-center">
            <div className="w-14 h-14 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-serif text-parchment-muted tracking-wide animate-pulse">Unrolling scroll...</p>
        </div>
    </div>
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
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/create" element={<CreateRoom />} />
                        <Route path="/join" element={<JoinRoom />} />
                        <Route path="/game/:matchId" element={<GameArena />} />
                        <Route path="/results/:matchId" element={<Results />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        ) : (
            <ConfigError />
        )}
    </React.StrictMode>,
)
