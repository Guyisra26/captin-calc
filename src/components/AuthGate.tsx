interface AuthGateProps {
  mode: 'signin' | 'denied' | 'loading';
  email?: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
);

export default function AuthGate({ mode, email, onSignIn, onSignOut }: AuthGateProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: 'var(--bg)',
        padding: '1rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '360px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '2rem 1.5rem',
        }}
      >
        <h1 className="brand" style={{ fontSize: '1.5rem', textAlign: 'center', margin: 0 }}>
          Captain <span className="brand-accent">Tavla</span>
        </h1>

        {mode === 'loading' && (
          <p style={{ color: 'var(--text-dim)', textAlign: 'center', margin: 0 }}>Loading…</p>
        )}

        {mode === 'signin' && (
          <>
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', margin: 0 }}>
              Sign in to continue
            </p>
            <button
              className="btn btn-captain"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={onSignIn}
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <p style={{ color: 'var(--text-faint)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>
              Access is limited to approved players.
            </p>
          </>
        )}

        {mode === 'denied' && (
          <>
            <p style={{ color: 'var(--text)', textAlign: 'center', margin: 0, fontWeight: 600 }}>
              No access
            </p>
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', margin: 0, fontSize: '0.9rem' }}>
              {email && <><strong>{email}</strong><br /></>}
              This account isn&apos;t on the guest list. Ask the host to add you.
            </p>
            <button
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={onSignOut}
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
