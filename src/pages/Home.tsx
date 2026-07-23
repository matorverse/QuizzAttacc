import { Link } from 'react-router-dom'

export default function Home() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
            <div className="max-w-4xl w-full">
                {/* Hero Section */}
                <div className="text-center mb-10 md:mb-14 animate-fade-in space-y-3">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-wood-dark border border-gold/40 text-gold text-xs font-serif font-semibold tracking-widest uppercase mb-2 shadow-sm">
                        ⚔️ Tavern Quiz Hall ⚔️
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold tracking-wider text-gold-gradient drop-shadow-md">
                        QUIZZATTACC
                    </h1>
                    <p className="text-lg md:text-2xl font-serif text-parchment-dark max-w-xl mx-auto italic">
                        A Cozy 1v1 Trivia Duel Among Friends
                    </p>
                    <p className="text-sm md:text-base text-parchment-muted/80 max-w-lg mx-auto font-body">
                        Gather round the table. Test your intellect. Claim the brass trophy.
                    </p>
                </div>

                {/* Action Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-10">
                    {/* Create Room Card */}
                    <Link to="/create" className="group">
                        <div className="wood-panel hover:border-gold hover:shadow-gold-glow transition-all duration-300 h-full flex flex-col items-center text-center p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="w-16 h-16 bg-gradient-to-br from-gold-light to-gold border-2 border-gold-dark rounded-2xl flex items-center justify-center mb-5 text-wood-darker group-hover:scale-110 transition-transform shadow-md">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-serif font-bold mb-2 text-gold-light tracking-wide">Host a Table</h2>
                            <p className="text-parchment-muted text-sm font-body">
                                Prepare a custom quiz battle and send your room code to an opponent
                            </p>
                        </div>
                    </Link>

                    {/* Join Room Card */}
                    <Link to="/join" className="group">
                        <div className="wood-panel hover:border-gold hover:shadow-gold-glow transition-all duration-300 h-full flex flex-col items-center text-center p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="w-16 h-16 bg-gradient-to-br from-wood-light to-wood-medium border-2 border-gold/60 rounded-2xl flex items-center justify-center mb-5 text-gold group-hover:scale-110 transition-transform shadow-md">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-serif font-bold mb-2 text-gold tracking-wide">Join a Duel</h2>
                            <p className="text-parchment-muted text-sm font-body">
                                Enter a 6-character tavern room code to enter an active match
                            </p>
                        </div>
                    </Link>
                </div>

                {/* Features Scroll */}
                <div className="card-parchment animate-slide-up">
                    <h3 className="text-lg font-serif font-bold mb-6 text-center text-parchment-text uppercase tracking-widest border-b border-parchment-border pb-3">
                        📜 How The Battle Unfolds 📜
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6 text-sm">
                        <div className="text-center space-y-2">
                            <div className="text-3xl mb-1">⚡</div>
                            <div className="font-serif font-bold text-parchment-text text-base">Real-Time Duels</div>
                            <div className="text-parchment-muted font-body text-xs leading-relaxed">Instant live scoring and synchronized question progression</div>
                        </div>
                        <div className="text-center space-y-2">
                            <div className="text-3xl mb-1">⚖️</div>
                            <div className="font-serif font-bold text-parchment-text text-base">Authoritative Logic</div>
                            <div className="text-parchment-muted font-body text-xs leading-relaxed">Server-side time validation and zero-trust anti-cheat audit trails</div>
                        </div>
                        <div className="text-center space-y-2">
                            <div className="text-3xl mb-1">🪙</div>
                            <div className="font-serif font-bold text-parchment-text text-base">Brass Combo Streaks</div>
                            <div className="text-parchment-muted font-body text-xs leading-relaxed">String together correct answers for up to 1.3x score multipliers</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-parchment-muted/60 text-xs font-serif">
                    <p>Crafted for Cozy Friends Trivia • Supabase • React • Tailwind CSS</p>
                </div>
            </div>
        </div>
    )
}
