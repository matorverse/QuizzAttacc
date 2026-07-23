/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Subtle Wooden Old-School Tavern Palette
                wood: {
                    darker: '#1C120B',   // Deep mahogany table background
                    dark: '#2A1A10',     // Rich oak paneling
                    medium: '#3E2718',   // Carved wood frames
                    light: '#5A3A23',    // Light polished timber
                    border: '#4A2E1A',   // Wooden card border
                },
                parchment: {
                    DEFAULT: '#F5ECE0', // Warm cream paper card
                    dark: '#E8DBC9',    // Aged parchment inset
                    border: '#D8C7B0',  // Soft paper edge border
                    text: '#2C1B10',    // Espresso ink typography
                    muted: '#6B5444',   // Muted brown text
                },
                gold: {
                    DEFAULT: '#D4AF37', // Warm brass / metallic gold
                    light: '#F3E5AB',   // Soft gold highlight
                    dark: '#AA820A',    // Deep bronze border
                    glow: 'rgba(212, 175, 55, 0.4)',
                },
                forest: {
                    DEFAULT: '#2D6A37', // Deep tavern green for correct answers
                    light: '#E8F5E9',   // Light green parchment feedback
                    border: '#1B4D24',
                },
                burgundy: {
                    DEFAULT: '#8B261D', // Crimson burgundy for incorrect answers
                    light: '#FFEBEE',   // Light red parchment feedback
                    border: '#5C1710',
                },
                // Keep cyber palette aliases for compatibility
                cyber: {
                    dark: '#2A1A10',
                    darker: '#1C120B',
                    blue: '#D4AF37',
                    purple: '#A855F7',
                    pink: '#EC4899',
                    green: '#2D6A37',
                    red: '#8B261D',
                },
            },
            fontFamily: {
                serif: ['Cinzel', 'Georgia', 'serif'],
                display: ['"Cinzel Decorative"', 'Cinzel', 'serif'],
                body: ['Lora', 'Georgia', 'serif'],
                sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'wood-bevel': '0 4px 0 #2A1A10, inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                'parchment-depth': '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
                'gold-glow': '0 0 20px rgba(212, 175, 55, 0.3)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'fade-in': 'fadeIn 0.2s ease-in',
                'scale-in': 'scaleIn 0.2s ease-out',
                'glow': 'glow 2s ease-in-out infinite',
            },
            keyframes: {
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                glow: {
                    '0%, 100%': { boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)' },
                    '50%': { boxShadow: '0 0 30px rgba(212, 175, 55, 0.6)' },
                },
            },
        },
    },
    plugins: [],
}
