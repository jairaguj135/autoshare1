import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Ride, Passenger } from '@/lib/types';
import { GeoPoint, haversineMeters, splitFare, calculateFare } from '@/lib/geo';
import LiveMap from '@/components/LiveMap';
import {
  Phone,
  Siren,
  CheckCircle2,
  Users,
  Route,
  Wallet,
  Clock,
  X,
  MapPin,
  Navigation,
  Car,
  ShieldAlert,
  Star,
} from 'lucide-react';

interface RideDetailProps {
  ride: Ride;
  onBack: () => void;
}

const driverNames = ['Ramesh K.', 'Suresh P.', 'Mohan L.', 'Anil R.', 'Deepak S.'];
const autoNums = ['MH 02 AB 1234', 'MH 02 XY 5678', 'MH 03 CD 9012', 'MH 02 EF 3456'];

export default function RideDetail({ ride, onBack }: RideDetailProps) {
  const { profile } = useAuth();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [current, setCurrent] = useState<Ride>(ride);
  const [sosActive, setSosActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('passengers')
        .select('*')
        .eq('ride_id', ride.id)
        .neq('status', 'cancelled')
        .order('joined_at', { ascending: true });
      setPassengers((data as Passenger[]) || []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`ride-${ride.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'passengers', filter: `ride_id=eq.${ride.id}` },
        async () => {
          const { data } = await supabase
            .from('passengers')
            .select('*')
            .eq('ride_id', ride.id)
            .neq('status', 'cancelled')
            .order('joined_at', { ascending: true });
          setPassengers((data as Passenger[]) || []);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides', filter: `id=eq.${ride.id}` },
        (payload) => {
          if (payload.new) setCurrent(payload.new as Ride);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ride.id]);

  const pickup: GeoPoint = { lat: current.pickup_lat, lng: current.pickup_lng, label: current.pickup_label };
  const dropoff: GeoPoint = { lat: current.dropoff_lat, lng: current.dropoff_lng, label: current.dropoff_label };

  // Build ordered stops: pickup → passenger boardings → dropoff
  const allStops: GeoPoint[] = [pickup];
  passengers.forEach((p) => {
    const bp: GeoPoint = { lat: p.boarding_lat, lng: p.boarding_lng, label: p.boarding_label };
    if (bp.label !== pickup.label && bp.label !== dropoff.label) {
      allStops.push(bp);
    }
  });
  allStops.push(dropoff);

  const markers = [
    { point: pickup, type: 'pickup' as const, label: pickup.label },
    { point: dropoff, type: 'dropoff' as const, label: dropoff.label },
    ...passengers
      .filter((p) => p.user_id !== current.creator_id)
      .map((p) => ({
        point: { lat: p.boarding_lat, lng: p.boarding_lng, label: p.boarding_label } as GeoPoint,
        type: 'passenger' as const,
        label: p.full_name.split(' ')[0],
      })),
  ];

  const totalDistance = haversineMeters(pickup, dropoff);
  const totalFare = current.total_fare || calculateFare(totalDistance);
  const perPersonBase = Math.round(totalFare / Math.max(1, passengers.length || 1));

  const isCreator = profile?.id === current.creator_id;
  const myPassenger = passengers.find((p) => p.user_id === profile?.id);
  const myShare = myPassenger?.share_amount ?? (isCreator ? splitFare(pickup, dropoff, allStops, totalFare) : perPersonBase);

  const startRide = async () => {
    const driverName = driverNames[Math.floor(Math.random() * driverNames.length)];
    const autoNumber = autoNums[Math.floor(Math.random() * autoNums.length)];
    const { error } = await supabase
      .from('rides')
      .update({ status: 'ongoing', driver_name: driverName, auto_number: autoNumber })
      .eq('id', current.id);
    if (error) console.error(error);
  };

  const completeRide = async () => {
    const { error } = await supabase
      .from('rides')
      .update({ status: 'completed' })
      .eq('id', current.id);
    if (error) console.error(error);
  };

  const cancelRide = async () => {
    const { error } = await supabase
      .from('rides')
      .update({ status: 'cancelled' })
      .eq('id', current.id);
    if (error) console.error(error);
  };

  const statusColor =
    current.status === 'ongoing'
      ? 'text-cyan-400 bg-cyan-400/10'
      : current.status === 'matched'
      ? 'text-emerald-400 bg-emerald-400/10'
      : current.status === 'completed'
      ? 'text-slate-400 bg-slate-700/30'
      : current.status === 'cancelled'
      ? 'text-rose-400 bg-rose-400/10'
      : 'text-amber-400 bg-amber-400/10';

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-800 transition">
          <X className="w-4 h-4 text-slate-400" />
        </button>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColor}`}>
          {current.status}
        </div>
      </div>

      {/* live map */}
      <LiveMap
        stops={allStops}
        markers={markers}
        autoPosition={current.status === 'ongoing' ? pickup : null}
        showAuto={current.status === 'ongoing'}
        height={300}
      />

      {/* route info */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center pt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="w-px h-8 bg-slate-700 my-1" />
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <div className="text-[10px] uppercase text-slate-500 tracking-wider">Pickup</div>
              <div className="text-sm text-white font-medium">{current.pickup_label}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-500 tracking-wider">Drop-off</div>
              <div className="text-sm text-white font-medium">{current.dropoff_label}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">{(totalDistance / 1000).toFixed(1)} km</div>
            <div className="text-xs text-slate-500 mt-3 flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" /> {Math.max(5, Math.round(totalDistance / 250))} min
            </div>
          </div>
        </div>
      </div>

      {/* driver / auto details */}
      {current.driver_name && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400/20 to-emerald-400/20 border border-cyan-400/30 flex items-center justify-center">
                <Car className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-sm text-white font-medium">{current.driver_name}</div>
                <div className="text-xs text-slate-400">{current.auto_number}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span className="text-xs font-medium">4.8</span>
              </div>
              <button className="w-9 h-9 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-400/20 transition">
                <Phone className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* co-passengers */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            {current.ride_type === 'shared' ? 'Co-passengers' : 'Solo ride'}
          </h3>
          <span className="text-xs text-slate-400">
            {current.seats_filled}/{current.seats_total} seats
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500">Loading passengers…</p>
        ) : passengers.length === 0 ? (
          <p className="text-xs text-slate-500">No passengers yet.</p>
        ) : (
          <div className="space-y-2">
            {passengers.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-900"
                    style={{ background: '#0ea5e9' }}
                  >
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs text-white font-medium">
                      {p.full_name}
                      {p.user_id === current.creator_id && (
                        <span className="ml-1 text-[9px] text-cyan-400 uppercase">Host</span>
                      )}
                      {p.user_id === profile?.id && (
                        <span className="ml-1 text-[9px] text-emerald-400 uppercase">You</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {p.boarding_label} → {p.dropoff_label}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-semibold text-emerald-400">₹{p.share_amount}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* fare split */}
      <div className="bg-gradient-to-br from-cyan-400/10 to-emerald-400/5 rounded-2xl border border-cyan-400/20 p-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-cyan-400" />
          Fare Breakdown
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] uppercase text-slate-500 tracking-wider">Total fare</div>
            <div className="text-lg font-bold text-white">₹{totalFare}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500 tracking-wider">Passengers</div>
            <div className="text-lg font-bold text-white">{passengers.length || 1}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500 tracking-wider">Your share</div>
            <div className="text-lg font-bold text-cyan-400">₹{myShare}</div>
          </div>
        </div>
        {current.ride_type === 'shared' && passengers.length > 1 && (
          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5" />
            You save ₹{totalFare - myShare} by sharing this ride.
          </p>
        )}
      </div>

      {/* action buttons */}
      <div className="space-y-2">
        {current.status === 'searching' && isCreator && (
          <>
            <button
              onClick={startRide}
              className="w-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Car className="w-4 h-4" /> Start ride now
            </button>
            <button
              onClick={cancelRide}
              className="w-full bg-slate-800 text-slate-300 font-medium rounded-xl py-2.5 text-xs hover:bg-slate-700 transition"
            >
              Cancel ride
            </button>
            <p className="text-center text-xs text-slate-500 pt-1">
              Waiting for co-passengers to join…
            </p>
          </>
        )}

        {current.status === 'matched' && isCreator && (
          <button
            onClick={startRide}
            className="w-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 hover:opacity-90 transition"
          >
            <Car className="w-4 h-4" /> Start ride
          </button>
        )}

        {current.status === 'ongoing' && isCreator && (
          <button
            onClick={completeRide}
            className="w-full bg-emerald-400 text-slate-900 font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 hover:bg-emerald-300 transition"
          >
            <CheckCircle2 className="w-4 h-4" /> Complete ride
          </button>
        )}

        {current.status === 'completed' && (
          <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
            <p className="text-sm text-white font-medium">Ride completed</p>
            <p className="text-xs text-slate-400 mt-0.5">
              You paid ₹{myShare} for this trip. Thanks for sharing!
            </p>
          </div>
        )}

        {current.status === 'cancelled' && (
          <div className="bg-rose-400/10 border border-rose-400/20 rounded-xl p-4 text-center">
            <X className="w-6 h-6 text-rose-400 mx-auto mb-1" />
            <p className="text-sm text-white font-medium">Ride cancelled</p>
          </div>
        )}
      </div>

      {/* SOS */}
      {current.status === 'ongoing' && (
        <div className="pt-2">
          <button
            onClick={() => setSosActive(!sosActive)}
            className={`w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition ${
              sosActive
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
            }`}
          >
            <Siren className="w-4 h-4" />
            {sosActive ? 'SOS Active — Help on the way' : 'Press SOS for emergency'}
          </button>
          {sosActive && (
            <div className="mt-3 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300 space-y-1">
              <p className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Emergency alert sent to your emergency contact.
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Live location sharing enabled with trusted contacts.
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Local emergency services notified.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
