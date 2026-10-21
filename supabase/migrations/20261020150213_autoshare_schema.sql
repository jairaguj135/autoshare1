/*
# AutoShare - Smart Shared Auto Booking Schema

1. New Tables
- `profiles`: rider profiles linked to auth users (full_name, phone, avatar_color)
- `rides`: an auto ride — solo or shared — with pickup/dropoff, route, fare, status, seat capacity
- `passengers`: passengers joined to a shared ride, each with their own boarding/alighting point and fare share
2. Security
- Enable RLS on all tables.
- profiles: owner-scoped (auth.uid() = id)
- rides: owner-scoped CRUD (creator owns the ride)
- passengers: authenticated users can read (to find matches), insert own, update/delete own
3. Notes
- Single city is simulated with lat/lng within a fixed bounding box for the stylized map.
- Ride statuses: searching, matched, ongoing, completed, cancelled.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  avatar_color text NOT NULL DEFAULT '#0ea5e9',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

CREATE TABLE IF NOT EXISTS rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pickup_label text NOT NULL,
  pickup_lat double precision NOT NULL,
  pickup_lng double precision NOT NULL,
  dropoff_label text NOT NULL,
  dropoff_lat double precision NOT NULL,
  dropoff_lng double precision NOT NULL,
  ride_type text NOT NULL DEFAULT 'shared' CHECK (ride_type IN ('solo','shared')),
  total_fare integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'searching' CHECK (status IN ('searching','matched','ongoing','completed','cancelled')),
  seats_total integer NOT NULL DEFAULT 3,
  seats_filled integer NOT NULL DEFAULT 1,
  driver_name text,
  auto_number text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_rides" ON rides;
CREATE POLICY "select_rides" ON rides FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_ride" ON rides;
CREATE POLICY "insert_own_ride" ON rides FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "update_own_ride" ON rides;
CREATE POLICY "update_own_ride" ON rides FOR UPDATE
  TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "delete_own_ride" ON rides;
CREATE POLICY "delete_own_ride" ON rides FOR DELETE
  TO authenticated USING (auth.uid() = creator_id);

CREATE TABLE IF NOT EXISTS passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  boarding_label text NOT NULL,
  boarding_lat double precision NOT NULL,
  boarding_lng double precision NOT NULL,
  dropoff_label text NOT NULL,
  dropoff_lat double precision NOT NULL,
  dropoff_lng double precision NOT NULL,
  share_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'joined' CHECK (status IN ('joined','picked_up','dropped','cancelled')),
  joined_at timestamptz DEFAULT now()
);

ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_passengers" ON passengers;
CREATE POLICY "select_passengers" ON passengers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_passenger" ON passengers;
CREATE POLICY "insert_own_passenger" ON passengers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_passenger" ON passengers;
CREATE POLICY "update_own_passenger" ON passengers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_passenger" ON passengers;
CREATE POLICY "delete_own_passenger" ON passengers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_passengers_ride ON passengers(ride_id);
CREATE INDEX IF NOT EXISTS idx_rides_creator ON rides(creator_id);