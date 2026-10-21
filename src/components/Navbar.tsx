import { Car, LogOut, History, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface NavbarProps {
  view: 'home' | 'history';
  onHome: () => void;
  onHistory: () => void;
  onNewRide: () => void;
}

export default function Navbar({ view, onHome, onHistory, onNewRide }: NavbarProps) {
  const { profile, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={onHome} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center">
            <Car className="w-4 h-4 text-slate-900" />
          </div>
          <span className="font-bold text-white text-sm">AutoShare</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={onHome}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              view === 'home'
                ? 'bg-slate-800 text-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5 inline mr-1" />
            New Ride
          </button>
          <button
            onClick={onHistory}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              view === 'history'
                ? 'bg-slate-800 text-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 inline mr-1" />
            My Trips
          </button>

          {profile && (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-900 ml-1"
              style={{ background: profile.avatar_color }}
            >
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            onClick={signOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
