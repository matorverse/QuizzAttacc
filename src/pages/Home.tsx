import { Link } from 'react-router-dom'

export default function Home() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                {/* Hero Section */}
                <div className="text-center mb-12 animate-fade-in">
                    <h1 className="text-6xl md:text-8xl font-bold mb-4 text-gradient">
                        QUIZEXE
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-2">
                        Real-Time 1v1 Quiz Battle
                    </p>
                    <p className="text-gray-400">
                        Challenge your friends. Test your knowledge. Prove your speed.
                    </p>
                </div>

                {/* Action Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Create Room Card */}
                    <Link to="/create" className="group">
                        <div className="card hover:border-cyber-blue transition-all duration-300 h-full">
                            <div className="flex flex-col items-center text-center p-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-cyber-blue to-cyber-purple rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold mb-2 text-cyber-blue">Create Room</h2>
                                <p className="text-gray-400">
                                    Start a new quiz battle and invite your opponent
                                </p>
                            </div>
                        </div>
                    </Link>

                    {/* Join Room Card */}
                    <Link to="/join" className="group">
                        <div className="card hover:border-cyber-purple transition-all duration-300 h-full">
                            <div className="flex flex-col items-center text-center p-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-cyber-purple to-cyber-pink rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold mb-2 text-cyber-purple">Join Room</h2>
                                <p className="text-gray-400">
                                    Enter a room code to join an existing battle
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Features */}
                <div className="glass rounded-xl p-6 animate-slide-up">
                    <h3 className="text-lg font-semibold mb-4 text-center">How It Works</h3>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                            <div className="text-3xl mb-2">⚡</div>
                            <div className="font-medium text-cyber-blue mb-1">Real-Time</div>
                            <div className="text-gray-400">Instant score updates and live competition</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl mb-2">🎯</div>
                            <div className="font-medium text-cyber-purple mb-1">Fair Play</div>
                            <div className="text-gray-400">Server-authoritative anti-cheat system</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl mb-2">🔥</div>
                            <div className="font-medium text-cyber-pink mb-1">Streak Bonus</div>
                            <div className="text-gray-400">Build combos for massive points</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-gray-500 text-sm">
                    <p>Built with Supabase • React • Tailwind CSS</p>
                </div>
            </div>
        </div>
    )
}
