import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Car, Loader2, ShieldCheck } from 'lucide-react';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      const userId = data.user?.id;
      if (userId) {
        const colors = ['#0ea5e9', '#34d399', '#fbbf24', '#f43f5e', '#a78bfa', '#fb923c'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        await supabase.from('profiles').insert({
          id: userId,
          full_name: fullName,
          phone,
          avatar_color: color,
        });
        await supabase.auth.signInWithPassword({ email, password });
      }
      setLoading(false);
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center px-6 pt-12 pb-6 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Car className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AutoShare</h1>
            <p className="text-xs text-slate-400">Share the ride. Split the fare.</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-1">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {mode === 'signup'
            ? 'Start sharing autos and saving on every trip.'
            : 'Sign in to find shared rides near you.'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <>
              <input
                type="text"
                required
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none transition"
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none transition"
              />
            </>
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none transition"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none transition"
          />

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup');
            setError(null);
          }}
          className="mt-4 text-sm text-slate-400 hover:text-cyan-400 transition text-center w-full"
        >
          {mode === 'signup'
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up"}
        </button>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5" />
          Verified rides with live tracking & SOS
        </div>
      </div>
    </div>
  );
}
