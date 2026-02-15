import { useState, useEffect } from 'react'
import { getTimerColor, formatTime } from '../lib/gameLogic'

interface TimerProps {
    duration: number
    onTimeout: () => void
    paused?: boolean
}

export default function Timer({ duration, onTimeout, paused = false }: TimerProps) {
    const [remaining, setRemaining] = useState(duration)

    useEffect(() => {
        if (paused) return

        const interval = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(interval)
                    onTimeout()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [paused, onTimeout])

    const percentage = (remaining / duration) * 100
    const circumference = 2 * Math.PI * 54
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    const colorClass = getTimerColor(remaining, duration)

    return (
        <div className="relative w-32 h-32">
            <svg className="transform -rotate-90 w-32 h-32">
                <circle
                    cx="64"
                    cy="64"
                    r="54"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-cyber-dark"
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
                    className={`${colorClass} transition-all duration-1000 ease-linear`}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-4xl font-bold ${colorClass} ${remaining <= 5 ? 'animate-pulse' : ''}`}>
                    {formatTime(remaining)}
                </span>
            </div>
        </div>
    )
}
