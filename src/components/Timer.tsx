import { useState, useEffect } from 'react'
import { getTimerColor, formatTime } from '../lib/gameLogic'

interface TimerProps {
    duration: number
    onTimeout: () => void
    paused?: boolean
    startTime?: number
}

export default function Timer({ duration, onTimeout, paused = false, startTime }: TimerProps) {
    const calcRemaining = () => {
        if (!startTime) return duration
        const elapsedSeconds = (Date.now() - startTime) / 1000
        return Math.max(0, Math.ceil(duration - elapsedSeconds))
    }

    const [remaining, setRemaining] = useState<number>(calcRemaining)

    useEffect(() => {
        setRemaining(calcRemaining())
    }, [duration, startTime])

    useEffect(() => {
        if (paused) return

        const interval = setInterval(() => {
            const currentRemaining = calcRemaining()
            setRemaining(currentRemaining)
            if (currentRemaining <= 0) {
                clearInterval(interval)
                onTimeout()
            }
        }, 200)

        return () => clearInterval(interval)
    }, [paused, startTime, duration, onTimeout])

    const percentage = (remaining / duration) * 100
    const circumference = 2 * Math.PI * 54
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    const colorClass = getTimerColor(remaining, duration)

    return (
        <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="transform -rotate-90 w-32 h-32 drop-shadow-md">
                <circle
                    cx="64"
                    cy="64"
                    r="54"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-wood-dark/80"
                />
                <circle
                    cx="64"
                    cy="64"
                    r="54"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className={`${colorClass} transition-all duration-300 ease-linear`}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-4xl font-serif font-bold ${colorClass} ${remaining <= 5 ? 'animate-pulse' : ''}`}>
                    {formatTime(remaining)}
                </span>
            </div>
        </div>
    )
}
