import { useState } from 'react';
import { api } from '../api';
import { saveAuth } from '../auth';

interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, display_name } = await api.login(username, password);
      saveAuth(token, display_name);
      onLogin();
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-full flex flex-col items-center justify-center"
      style={{ background: 'var(--wood-dark)', padding: '1.5rem' }}
    >
      <div className="w-full max-w-sm">
        <h1
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: '2rem',
            color: 'var(--gold-light)',
            textAlign: 'center',
            marginBottom: '2rem',
            letterSpacing: '0.04em',
          }}
        >
          ♟ Captain
        </h1>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--cream)', letterSpacing: '0.03em' }}>
            Host Login
          </h2>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            className="board-input w-full"
            autoFocus
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="board-input w-full"
            required
          />
          {error && (
            <p style={{ color: 'var(--color-negative)', fontSize: '0.85rem' }}>{error}</p>
          )}
          <button
            type="submit"
            className="btn btn-captain w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
