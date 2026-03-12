import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LoginPageProps {
  onShowRegister: () => void;
}

export function LoginPage({ onShowRegister }: LoginPageProps) {
  const { login } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      login(usernameOrEmail, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #f5f0e6 0%, #eee8d6 50%, #f0eddb 100%)' }}
    >
      {/* Decorative background blobs */}
      <div className="absolute top-[-80px] left-[-60px] w-72 h-72 rounded-full opacity-30" style={{ background: '#facc15' }} />
      <div className="absolute bottom-[-60px] right-[-40px] w-56 h-56 rounded-full opacity-20" style={{ background: '#2563eb' }} />
      <div className="absolute top-1/3 right-[-30px] w-40 h-40 rounded-full opacity-20" style={{ background: '#65a30d' }} />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(24,24,27,0.07) 1.5px, transparent 1.5px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Mascot */}
      <div className="animate-mascot-float animate-auth-enter relative z-10 mb-4">
        <img
          src="/mascot-main.jpg"
          alt="Embark mascot"
          className="w-52 h-52 object-contain"
          style={{ filter: 'drop-shadow(0 8px 28px rgba(0,0,0,0.22))' }}
        />
      </div>

      {/* Card */}
      <div
        className="animate-auth-enter-delay relative z-10 w-full max-w-sm bg-zinc-900 border-4 border-zinc-900 rounded-[6px] pt-6 pb-7 px-7"
        style={{ boxShadow: '6px 6px 0 0 rgba(24,24,27,0.5)' }}
      >
        <p className="text-zinc-400 text-xs text-center mb-5 tracking-widest uppercase font-semibold">
          Welcome back
        </p>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-900/50 border border-red-700 rounded-[4px] text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 tracking-wide uppercase">
              Username or email
            </label>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={e => setUsernameOrEmail(e.target.value)}
              required
              autoFocus
              className="w-full bg-zinc-800 border-2 border-zinc-600 rounded-[4px] px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm"
              placeholder="username or email"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 tracking-wide uppercase">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-800 border-2 border-zinc-600 rounded-[4px] px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-black py-3 rounded-[4px] border-2 border-zinc-900 shadow-[4px_4px_0_0_#18181b] hover:shadow-[2px_2px_0_0_#18181b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm tracking-wide"
          >
            Sign in
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500">
          No account?{' '}
          <button
            onClick={onShowRegister}
            className="text-yellow-400 font-bold hover:text-yellow-300 transition-colors"
          >
            Register free
          </button>
        </p>
      </div>
    </div>
  );
}
