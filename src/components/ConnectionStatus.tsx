import { getConnectionColor, getConnectionText } from '../lib/gameLogic'

interface ConnectionStatusProps {
    state: 'connected' | 'reconnecting' | 'disconnected'
}

export default function ConnectionStatus({ state }: ConnectionStatusProps) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${getConnectionColor(state)} ${state === 'reconnecting' ? 'animate-pulse' : ''}`}></div>
            <span className="text-gray-400">{getConnectionText(state)}</span>
        </div>
    )
}
