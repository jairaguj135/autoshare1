import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Ride } from '@/lib/types';
import AuthScreen from '@/components/AuthScreen';
import Navbar from '@/components/Navbar';
import BookingScreen from '@/components/BookingScreen';
import RideDetail from '@/components/RideDetail';
import HistoryScreen from '@/components/HistoryScreen';
import { Loader2 } from 'lucide-react';

type View = 'home' | 'history' | 'detail';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('home');
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const goHome = () => {
    setActiveRide(null);
    setView('home');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar
        view={view === 'detail' ? 'home' : view}
        onHome={goHome}
        onHistory={() => {
          setActiveRide(null);
          setView('history');
        }}
        onNewRide={goHome}
      />

      {view === 'detail' && activeRide ? (
        <RideDetail ride={activeRide} onBack={() => setView('history')} />
      ) : view === 'history' ? (
        <HistoryScreen onOpenRide={(r) => { setActiveRide(r); setView('detail'); }} />
      ) : (
        <BookingScreen
          onRideCreated={(ride) => {
            setActiveRide(ride);
            setView('detail');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
