interface SpectatorScreenProps {
  roomCode: string;
  status: 'waiting' | 'ended';
}

export default function SpectatorScreen({ roomCode, status }: SpectatorScreenProps) {
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="text-6xl">{status === 'waiting' ? '⏳' : '🏁'}</div>
        <h2 className="text-2xl font-bold text-slate-200">
          {status === 'waiting' ? 'Waiting for host...' : 'Game ended'}
        </h2>
        <p className="text-slate-400">
          {status === 'waiting'
            ? 'The host has not started the game yet.'
            : 'The host has reset the game.'}
        </p>
        <p className="text-sm text-slate-600">Room: {roomCode}</p>
      </div>
    </div>
  );
}
