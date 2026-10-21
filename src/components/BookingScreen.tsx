import { useState } from 'react';
import { CITY_LOCATIONS, calculateFare, haversineMeters, type GeoPoint } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Ride } from '@/lib/types';
import LiveMap from '@/components/LiveMap';
import { Search, MapPin, Navigation, Users, Zap, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

interface BookingScreenProps {
  onRideCreated: (ride: Ride) => void;
}

type Step = 'details' | 'matching' | 'results';

export default function BookingScreen({ onRideCreated }: BookingScreenProps) {
  const { profile } = useAuth();
  const [pickup, setPickup] = useState<GeoPoint | null>(null);
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null);
  const [rideType, setRideType] = useState<'solo' | 'shared'>('shared');
  const [step, setStep] = useState<Step>('details');
  const [matches, setMatches] = useState<Ride[]>([]);
  const [searching, setSearching] = useState(false);

  const distance = pickup && dropoff ? haversineMeters(pickup, dropoff) : 0;
  const soloFare = calculateFare(distance);
  const sharedEstimate = Math.round(soloFare * 0.45);

  const stops = pickup && dropoff ? [pickup, dropoff] : [];

  const handleSearch = async () => {
    if (!pickup || !dropoff || !profile) return;
    setStep('matching');
    setSearching(true);

    // Find existing shared rides that are searching and have seats, with route overlap.
    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'searching')
      .eq('ride_type', 'shared')
      .neq('creator_id', profile.id)
      .lt('seats_filled', 3);

    const allRides = (data as Ride[]) || [];

    // Score by proximity: pickup near their route, dropoff near their route.
    const scored = allRides
      .map((r) => {
        const rPickup: GeoPoint = { lat: r.pickup_lat, lng: r.pickup_lng, label: r.pickup_label };
        const rDrop: GeoPoint = { lat: r.dropoff_lat, lng: r.dropoff_lng, label: r.dropoff_label };
        const pickScore = haversineMeters(pickup, rPickup) + haversineMeters(pickup, rDrop);
        const dropScore = haversineMeters(dropoff, rPickup) + haversineMeters(dropoff, rDrop);
        return { ride: r, score: Math.min(pickScore, dropScore) };
      })
      .filter((m) => m.score < 8000)
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map((m) => m.ride);

    // simulate delay for UX
    await new Promise((r) => setTimeout(r, 1800));
    setMatches(scored);
    setSearching(false);

    if (rideType === 'solo' || scored.length === 0) {
      // create ride directly
      await createRide([]);
    }
  };

  const createRide = async (passengers: GeoPoint[]) => {
    if (!pickup || !dropoff || !profile) return;
    const fare = rideType === 'solo' ? soloFare : soloFare;
    const driverNames = ['Ramesh K.', 'Suresh P.', 'Mohan L.', 'Anil R.', 'Deepak S.'];
    const autoNums = ['MH 02 AB 1234', 'MH 02 XY 5678', 'MH 03 CD 9012', 'MH 02 EF 3456'];
    const driverName = driverNames[Math.floor(Math.random() * driverNames.length)];
    const autoNumber = autoNums[Math.floor(Math.random() * autoNums.length)];

    const { data, error } = await supabase
      .from('rides')
      .insert({
        creator_id: profile.id,
        pickup_label: pickup.label,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_label: dropoff.label,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        ride_type: rideType,
        total_fare: fare,
        status: rideType === 'solo' ? 'matched' : 'searching',
        seats_filled: 1,
        driver_name: driverName,
        auto_number: autoNumber,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      setStep('details');
      return;
    }
    onRideCreated(data as Ride);
  };

  const joinMatch = async (ride: Ride) => {
    if (!pickup || !dropoff || !profile) return;
    // insert passenger row
    const { error: pErr } = await supabase.from('passengers').insert({
      ride_id: ride.id,
      user_id: profile.id,
      full_name: profile.full_name,
      boarding_label: pickup.label,
      boarding_lat: pickup.lat,
      boarding_lng: pickup.lng,
      dropoff_label: dropoff.label,
      dropoff_lat: dropoff.lat,
      dropoff_lng: dropoff.lng,
      share_amount: sharedEstimate,
      status: 'joined',
    });
    if (pErr) {
      console.error(pErr);
      return;
    }
    // increment seats
    await supabase
      .from('rides')
      .update({
        seats_filled: ride.seats_filled + 1,
        status: ride.seats_filled + 1 >= 2 ? 'matched' : 'searching',
      })
      .eq('id', ride.id);

    onRideCreated(ride);
  };

  if (step === 'matching') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-cyan-400/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              {searching ? (
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              )}
            </div>
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">
            {searching ? 'Finding co-passengers…' : 'Search complete'}
          </h2>
          <p className="text-sm text-slate-400">
            {searching
              ? 'Matching your route with nearby passengers heading the same way.'
              : matches.length > 0
              ? `${matches.length} matching ride${matches.length > 1 ? 's' : ''} found.`
              : 'No matching rides yet — we’ll create one for you.'}
          </p>

          <div className="mt-6">
            <LiveMap stops={stops} height={200} />
          </div>
        </div>
      </div>
    );
  }

  if (step === 'results' && matches.length > 0) {
    // unused path — joinMatch transitions directly. Kept for safety.
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Hero card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 rounded-2xl border border-slate-800 p-5">
        <h1 className="text-lg font-bold text-white mb-1">Where are you going?</h1>
        <p className="text-sm text-slate-400 mb-4">
          Pick your route and we’ll find co-passengers travelling the same way.
        </p>

        {/* Pickup */}
        <div className="space-y-2">
          <LocationPicker
            icon={<MapPin className="w-4 h-4 text-emerald-400" />}
            label="Pickup point"
            value={pickup}
            onChange={setPickup}
          />
          <LocationPicker
            icon={<Navigation className="w-4 h-4 text-rose-400" />}
            label="Drop-off point"
            value={dropoff}
            onChange={setDropoff}
          />
        </div>

        {pickup && dropoff && (
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>{(distance / 1000).toFixed(1)} km route</span>
            <span>Est. {Math.max(5, Math.round(distance / 250))} min</span>
          </div>
        )}
      </div>

      {/* Map preview */}
      {pickup && dropoff && (
        <LiveMap
          stops={stops}
          markers={[
            { point: pickup, type: 'pickup', label: pickup.label },
            { point: dropoff, type: 'dropoff', label: dropoff.label },
          ]}
          height={240}
        />
      )}

      {/* Ride type selection */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Choose ride type</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setRideType('shared')}
            className={`text-left rounded-xl border p-4 transition ${
              rideType === 'shared'
                ? 'border-cyan-400 bg-cyan-400/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <Users className="w-5 h-5 text-cyan-400 mb-2" />
            <div className="text-sm font-semibold text-white">Shared Ride</div>
            <div className="text-xs text-slate-400 mt-0.5">Split fare with co-passengers</div>
            {pickup && dropoff && (
              <div className="mt-2 text-cyan-400 font-bold text-sm">
                ~₹{sharedEstimate}
              </div>
            )}
          </button>
          <button
            onClick={() => setRideType('solo')}
            className={`text-left rounded-xl border p-4 transition ${
              rideType === 'solo'
                ? 'border-amber-400 bg-amber-400/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <Zap className="w-5 h-5 text-amber-400 mb-2" />
            <div className="text-sm font-semibold text-white">Solo Ride</div>
            <div className="text-xs text-slate-400 mt-0.5">Private auto, leave now</div>
            {pickup && dropoff && (
              <div className="mt-2 text-amber-400 font-bold text-sm">₹{soloFare}</div>
            )}
          </button>
        </div>
      </div>

      {/* Match results (inline after search) */}
      {matches.length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">
            {matches.length} matching ride{matches.length > 1 ? 's' : ''} found
          </h2>
          {matches.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3 border border-slate-700/50"
            >
              <div>
                <div className="text-sm text-white font-medium">
                  {m.pickup_label} → {m.dropoff_label}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {m.seats_filled}/{m.seats_total} seats · Your share ~₹{sharedEstimate}
                </div>
              </div>
              <button
                onClick={() => joinMatch(m)}
                className="bg-cyan-400 text-slate-900 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-cyan-300 transition flex items-center gap-1"
              >
                Join <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={!pickup || !dropoff}
        className="w-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 font-semibold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Search className="w-4 h-4" />
        {rideType === 'shared' ? 'Find co-passengers' : 'Book solo ride'}
      </button>
    </div>
  );
}

function LocationPicker({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: GeoPoint | null;
  onChange: (p: GeoPoint) => void;
}) {
  return (
    <div className="relative">
      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 mt-0.5">
        <span className="shrink-0">{icon}</span>
        <select
          value={value?.label ?? ''}
          onChange={(e) => {
            const loc = CITY_LOCATIONS.find((l) => l.label === e.target.value);
            if (loc) onChange(loc);
          }}
          className="w-full bg-transparent text-sm text-white focus:outline-none cursor-pointer"
        >
          <option value="" disabled className="bg-slate-800">
            Select location…
          </option>
          {CITY_LOCATIONS.map((loc) => (
            <option key={loc.label} value={loc.label} className="bg-slate-800">
              {loc.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
