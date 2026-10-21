export interface Ride {
  id: string;
  creator_id: string;
  pickup_label: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_label: string;
  dropoff_lat: number;
  dropoff_lng: number;
  ride_type: 'solo' | 'shared';
  total_fare: number;
  status: 'searching' | 'matched' | 'ongoing' | 'completed' | 'cancelled';
  seats_total: number;
  seats_filled: number;
  driver_name: string | null;
  auto_number: string | null;
  created_at: string;
}

export interface Passenger {
  id: string;
  ride_id: string;
  user_id: string;
  full_name: string;
  boarding_label: string;
  boarding_lat: number;
  boarding_lng: number;
  dropoff_label: string;
  dropoff_lat: number;
  dropoff_lng: number;
  share_amount: number;
  status: 'joined' | 'picked_up' | 'dropped' | 'cancelled';
  joined_at: string;
}

export interface RideWithPassengers extends Ride {
  passengers: Passenger[];
}
