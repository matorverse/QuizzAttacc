// Web Audio API Synthesizer module for QuizzAttacc tavern sound cues

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContextClass) {
            audioCtx = new AudioContextClass()
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {})
    }
    return audioCtx
}

let muted = typeof localStorage !== 'undefined' ? localStorage.getItem('quizexe_muted') === 'true' : false

export const isAudioMuted = (): boolean => muted

export const toggleAudioMute = (): boolean => {
    muted = !muted
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('quizexe_muted', String(muted))
    }
    return muted
}

export const playClick = () => {
    if (muted) return
    const ctx = getAudioContext()
    if (!ctx) return

    try {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(320, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.05)

        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.05)
    } catch {
        // Audio playback error fallback
    }
}

export const playCorrect = () => {
    if (muted) return
    const ctx = getAudioContext()
    if (!ctx) return

    try {
        const now = ctx.currentTime
        const notes = [523.25, 659.25, 783.99] // C5, E5, G5 major triad

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(freq, now + i * 0.08)

            gain.gain.setValueAtTime(0, now + i * 0.08)
            gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4)

            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(now + i * 0.08)
            osc.stop(now + i * 0.08 + 0.4)
        })
    } catch {
        // Audio error fallback
    }
}

export const playIncorrect = () => {
    if (muted) return
    const ctx = getAudioContext()
    if (!ctx) return

    try {
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(180, now)
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.25)

        gain.gain.setValueAtTime(0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.25)
    } catch {
        // Audio error fallback
    }
}

export const playStreak = () => {
    if (muted) return
    const ctx = getAudioContext()
    if (!ctx) return

    try {
        const now = ctx.currentTime
        const notes = [440, 554.37, 659.25, 880] // A4, C#5, E5, A5

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'triangle'
            osc.frequency.setValueAtTime(freq, now + i * 0.06)

            gain.gain.setValueAtTime(0, now + i * 0.06)
            gain.gain.linearRampToValueAtTime(0.25, now + i * 0.06 + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.5)

            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(now + i * 0.06)
            osc.stop(now + i * 0.06 + 0.5)
        })
    } catch {
        // Audio error fallback
    }
}

export const playVictory = () => {
    if (muted) return
    const ctx = getAudioContext()
    if (!ctx) return

    try {
        const now = ctx.currentTime
        const chord = [523.25, 659.25, 783.99, 1046.50] // C major arpeggio fanfare

        chord.forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(freq, now + i * 0.1)

            gain.gain.setValueAtTime(0, now + i * 0.1)
            gain.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.04)
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.8)

            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(now + i * 0.1)
            osc.stop(now + i * 0.1 + 0.8)
        })
    } catch {
        // Audio error fallback
    }
}
