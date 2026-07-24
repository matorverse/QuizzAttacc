import { memo } from 'react'
import { getConnectionColor, getConnectionText } from '../lib/gameLogic'

interface ConnectionStatusProps {
    state: 'connected' | 'reconnecting' | 'disconnected'
}

function ConnectionStatus({ state }: ConnectionStatusProps) {
    return (
        <div className="flex items-center gap-2 text-xs font-serif">
            <div className={`w-2.5 h-2.5 rounded-full ${getConnectionColor(state)} ${state === 'reconnecting' ? 'animate-pulse' : ''} shadow-sm`}></div>
            <span className="text-parchment-muted tracking-wider uppercase">{getConnectionText(state)}</span>
        </div>
    )
}

export default memo(ConnectionStatus)
