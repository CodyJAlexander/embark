import { useState, type FormEvent } from 'react';
import { useAuth, type RegisterData } from '../../context/AuthContext';

interface RegisterPageProps {
  onShowLogin: () => void;
}

function getPasswordStrength(password: string): 'weak' | 'ok' | 'strong' {
  if (password.length < 6) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [password.length >= 8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 3) return 'strong';
  if (score >= 2) return 'ok';
  return 'weak';
}

const strengthConfig = {
  weak: { label: 'Weak', color: 'bg-red-500', width: 'w-1/3' },
  ok: { label: 'OK', color: 'bg-yellow-400', width: 'w-2/3' },
  strong: { label: 'Strong', color: 'bg-green-500', width: 'w-full' },
};

export function RegisterPage({ onShowLogin }: RegisterPageProps) {
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', phone: '' });
  const [error, setError] = useState('');

  const strength = form.password ? getPasswordStrength(form.password) : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    const data: RegisterData = {
      username: form.username,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
    };
    try {
      register(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

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

      {/* Mascot — smaller on register to leave room for the form */}
      <div className="animate-mascot-float animate-auth-enter relative z-10 mb-3">
        <img
          src="/mascot-main.jpg"
          alt="Embark mascot"
          className="w-40 h-40 object-contain"
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.18))' }}
        />
      </div>

      {/* Card */}
      <div
        className="animate-auth-enter-delay relative z-10 w-full max-w-sm bg-zinc-900 border-4 border-zinc-900 rounded-[6px] pt-6 pb-7 px-7"
        style={{ boxShadow: '6px 6px 0 0 rgba(24,24,27,0.5)' }}
      >
        <p className="text-zinc-400 text-xs text-center mb-5 tracking-widest uppercase font-semibold">
          Create your account
        </p>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-900/50 border border-red-700 rounded-[4px] text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 tracking-wide uppercase">
              Username <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.username}
              onChange={set('username')}
              required
              autoFocus
              className="w-full bg-zinc-800 border-2 border-zinc-600 rounded-[4px] px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm"
              placeholder="your_username"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 tracking-wide uppercase">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              className="w-full bg-zinc-800 border-2 border-zinc-600 rounded-[4px] px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 tracking-wide uppercase">
              Phone <span className="text-zinc-500 text-xs normal-case font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              className="w-full bg-zinc-800 border-2 border-zinc-600 rounded-[4px] px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm"
              placeholder="+1 555 000 0000"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 tracking-wide uppercase">
              Password <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              required
              className="w-full bg-zinc-800 border-2 border-zinc-600 rounded-[4px] px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm"
              placeholder="••••••••"
            />
            {strength && (
              <div className="mt-1.5">
                <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strengthConfig[strength].color} ${strengthConfig[strength].width}`} />
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Strength: <span className={strength === 'strong' ? 'text-green-400' : strength === 'ok' ? 'text-yellow-400' : 'text-red-400'}>{strengthConfig[strength].label}</span>
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 tracking-wide uppercase">
              Confirm password <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={form.confirm}
              onChange={set('confirm')}
              required
              className="w-full bg-zinc-800 border-2 border-zinc-600 rounded-[4px] px-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 transition-colors text-sm"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-black py-3 rounded-[4px] border-2 border-zinc-900 shadow-[4px_4px_0_0_#18181b] hover:shadow-[2px_2px_0_0_#18181b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm tracking-wide mt-1"
          >
            Create account
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <button
            onClick={onShowLogin}
            className="text-yellow-400 font-bold hover:text-yellow-300 transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
