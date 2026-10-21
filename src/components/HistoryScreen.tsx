import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Ride } from '@/lib/types';
import { Car, MapPin, Navigation, Wallet, Clock, Calendar } from 'lucide-react';

interface HistoryScreenProps {
  onOpenRide: (ride: Ride) => void;
}

export default function HistoryScreen({ onOpenRide }: HistoryScreenProps) {
  const { profile } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      // Rides created by user OR rides where user is a passenger
      const [created, joined] = await Promise.all([
        supabase
          .from('rides')
          .select('*')
          .eq('creator_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('passengers')
          .select('ride_id')
          .eq('user_id', profile.id),
      ]);

      const createdRides = (created.data as Ride[]) || [];
      const joinedIds = ((joined.data as { ride_id: string }[]) || []).map((r) => r.ride_id);

      let joinedRides: Ride[] = [];
      if (joinedIds.length) {
        const { data } = await supabase
          .from('rides')
          .select('*')
          .in('id', joinedIds)
          .neq('creator_id', profile.id)
          .order('created_at', { ascending: false });
        joinedRides = (data as Ride[]) || [];
      }

      const all = [...createdRides, ...joinedRides].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRides(all);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-slate-500 text-sm">
        Loading your trips…
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <Car className="w-7 h-7 text-slate-600" />
        </div>
        <h2 className="text-base font-semibold text-white mb-1">No trips yet</h2>
        <p className="text-sm text-slate-400">Book your first ride to see it here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
      <h1 className="text-lg font-bold text-white mb-1">My Trips</h1>
      <p className="text-xs text-slate-400 mb-4">All your past and active rides</p>

      {rides.map((ride) => {
        const isCreator = ride.creator_id === profile?.id;
        const statusColor =
          ride.status === 'ongoing'
            ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20'
            : ride.status === 'matched'
            ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
            : ride.status === 'completed'
            ? 'bg-slate-700/30 text-slate-400 border-slate-600/30'
            : ride.status === 'cancelled'
            ? 'bg-rose-400/10 text-rose-400 border-rose-400/20'
            : 'bg-amber-400/10 text-amber-400 border-amber-400/20';

        return (
          <button
            key={ride.id}
            onClick={() => onOpenRide(ride)}
            className="w-full text-left bg-slate-900 rounded-2xl border border-slate-800 p-4 hover:border-slate-700 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${statusColor}`}
                >
                  {ride.status}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {ride.ride_type}
                </span>
                {!isCreator && (
                  <span className="text-[10px] text-cyan-400 uppercase tracking-wider">Joined</span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(ride.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex flex-col items-center">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span className="w-px h-5 bg-slate-700 my-0.5" />
                <Navigation className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="text-sm text-white font-medium">{ride.pickup_label}</div>
                <div className="text-sm text-white font-medium">{ride.dropoff_label}</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-cyan-400">₹{ride.total_fare}</div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" />
                  {new Date(ride.created_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                {ride.seats_filled}/{ride.seats_total} seats filled
              </span>
              <span className="text-xs text-slate-500">Tap to view details →</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
