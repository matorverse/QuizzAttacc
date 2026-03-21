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

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const hasConfig = envUrl && envKey && 
                 envUrl !== 'your_supabase_project_url' && 
                 envKey !== 'your_supabase_anon_key' &&
                 envUrl.startsWith('http')

const ConfigError = () => (
    <div className="min-h-screen bg-cyber-darker text-white flex items-center justify-center p-4">
        <div className="card-glow max-w-lg w-full text-center space-y-6">
            <h1 className="text-3xl font-bold text-cyber-red">Missing Configuration</h1>
            <p className="text-gray-300">
                The application cannot start because the Supabase environment variables are missing.
            </p>
            <div className="bg-black/50 p-4 rounded text-left font-mono text-sm text-cyber-pink">
                <p># Create a .env file in the root directory with:</p>
                <p>VITE_SUPABASE_URL=your_project_url</p>
                <p>VITE_SUPABASE_ANON_KEY=your_anon_key</p>
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

