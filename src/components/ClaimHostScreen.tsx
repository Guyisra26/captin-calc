interface ClaimHostScreenProps {
  roomCode: string;
  status: 'confirm' | 'claiming' | 'expired';
  onConfirm: () => void;
  onWatchInstead: () => void;
}

export default function ClaimHostScreen({ roomCode, status, onConfirm, onWatchInstead }: ClaimHostScreenProps) {
  return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <h1 className="brand" style={{ fontSize: '1.5rem', marginBottom: '0.9rem' }}>
          Captain <span className="brand-accent">Tavla</span>
        </h1>

        {status === 'expired' ? (
          <>
            <p style={{ color: 'var(--text)', fontWeight: 500, marginBottom: '0.4rem' }}>
              This transfer link is no longer valid
            </p>
            <p style={{ color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
              The offer expired or was already used.
            </p>
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onWatchInstead}>
              Watch as spectator
            </button>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-dim)', marginBottom: '0.25rem' }}>Take over hosting of</p>
            <p style={{ color: 'var(--text)', fontWeight: 500, fontSize: '1.15rem', marginBottom: '1.25rem' }}>
              room {roomCode}
            </p>
            <button
              className={`btn btn-captain ${status === 'claiming' ? 'btn-disabled' : ''}`}
              style={{ width: '100%', marginBottom: '0.6rem' }}
              onClick={onConfirm}
            >
              {status === 'claiming' ? 'Taking over…' : 'Take over hosting'}
            </button>
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onWatchInstead}>
              Just watch instead
            </button>
          </>
        )}
      </div>
    </div>
  );
}
