interface SpectatorScreenProps {
  roomCode: string;
  status: 'waiting' | 'ended';
}

export default function SpectatorScreen({ roomCode, status }: SpectatorScreenProps) {
  return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="text-center space-y-4">
        <div className="text-6xl">{status === 'waiting' ? '⏳' : '🏁'}</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.4rem', color: 'var(--text)' }}>
          {status === 'waiting' ? 'Waiting for host...' : 'Game ended'}
        </h2>
        <p style={{ color: 'var(--text-dim)' }}>
          {status === 'waiting'
            ? 'The host has not started the game yet.'
            : 'The host has reset the game.'}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>Room: {roomCode}</p>
      </div>
    </div>
  );
}
