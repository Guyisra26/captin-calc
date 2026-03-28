import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import DashboardScreen from './DashboardScreen';

interface Props {
  onBack: () => void;
}

type Tab = 'users' | 'stats';

interface UserRecord {
  id: string;
  username: string;
  display_name: string;
}

export default function AdminScreen({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [form, setForm] = useState({ username: '', display_name: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadUsers = useCallback(() => {
    setLoading(true);
    setFetchError('');
    api.getAdminUsers()
      .then(setUsers)
      .catch(() => setFetchError('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab, loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.display_name || !form.password) return;
    setCreating(true);
    setCreateError('');
    try {
      await api.createAdminUser(form);
      setForm({ username: '', display_name: '', password: '' });
      loadUsers();
    } catch {
      setCreateError('Failed to create user (username may already exist)');
    } finally {
      setCreating(false);
    }
  };

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        padding: '0.5rem 1.25rem',
        background: tab === t ? 'rgba(200,150,40,0.15)' : 'none',
        border: 'none',
        borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
        color: tab === t ? 'var(--gold-light)' : 'var(--cream-dark)',
        fontFamily: "'Cinzel', serif",
        fontSize: '0.85rem',
        letterSpacing: '0.04em',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '4px',
    color: 'var(--cream)',
    fontSize: '0.9rem',
    width: '100%',
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--wood-darkest)' }}>
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-3 py-2 shrink-0"
        style={{
          background: 'linear-gradient(180deg, var(--wood-mid) 0%, var(--wood-dark) 100%)',
          borderBottom: '2px solid var(--gold-dark)',
        }}
      >
        <button onClick={onBack} className="btn btn-ghost px-3 py-1.5 text-sm">
          ← Back
        </button>
        <h1
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: '1.1rem',
            color: 'var(--gold-light)',
            letterSpacing: '0.04em',
          }}
        >
          ⚙ Admin
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'var(--wood-dark)', flexShrink: 0 }}>
        {tabBtn('users', 'Users')}
        {tabBtn('stats', 'Stats')}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'stats' ? (
          <DashboardScreen onBack={() => setTab('users')} />
        ) : (
          <div className="p-3 space-y-4 max-w-lg mx-auto">
            {/* Create user form */}
            <div className="card">
              <h2 style={{ fontFamily: "'Cinzel', serif", color: 'var(--gold)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                Create User
              </h2>
              <form onSubmit={handleCreate} className="space-y-2">
                <input
                  style={inputStyle}
                  placeholder="Username (for login)"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder="Display name"
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                {createError && (
                  <p style={{ color: 'var(--color-negative)', fontSize: '0.8rem' }}>{createError}</p>
                )}
                <button
                  type="submit"
                  disabled={creating || !form.username || !form.display_name || !form.password}
                  className={`btn btn-captain w-full py-2 ${creating || !form.username || !form.display_name || !form.password ? 'btn-disabled' : ''}`}
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>

            {/* User list */}
            <div className="card">
              <h2 style={{ fontFamily: "'Cinzel', serif", color: 'var(--gold)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                All Users
              </h2>
              {loading && (
                <p style={{ color: 'var(--cream-dark)', opacity: 0.5, fontSize: '0.85rem' }}>Loading...</p>
              )}
              {fetchError && (
                <p style={{ color: 'var(--color-negative)', fontSize: '0.85rem' }}>{fetchError}</p>
              )}
              <div className="space-y-1">
                {users.map(u => (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.4rem 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <span style={{ color: 'var(--cream)', fontSize: '0.9rem' }}>{u.display_name}</span>
                    <span style={{ color: 'var(--cream-dark)', opacity: 0.5, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      {u.username}
                    </span>
                  </div>
                ))}
                {!loading && users.length === 0 && !fetchError && (
                  <p style={{ color: 'var(--cream-dark)', opacity: 0.4, fontSize: '0.85rem' }}>No users found.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
