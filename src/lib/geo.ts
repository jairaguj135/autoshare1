// Simulated city map coordinate system. Stylized — lat/lng mapped to x/y.
// "Navi Metro" fictional city grid.

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

// Fixed set of named locations within the simulated city.
export const CITY_LOCATIONS: GeoPoint[] = [
  { lat: 19.0760, lng: 72.8777, label: 'Central Station' },
  { lat: 19.0820, lng: 72.8810, label: 'Tech Park' },
  { lat: 19.0700, lng: 72.8700, label: 'Riverside Mall' },
  { lat: 19.0680, lng: 72.8850, label: 'Green Valley' },
  { lat: 19.0900, lng: 72.8650, label: 'Sunrise Apartments' },
  { lat: 19.0620, lng: 72.8900, label: 'Lakeview' },
  { lat: 19.0850, lng: 72.8950, label: 'Market Square' },
  { lat: 19.0720, lng: 72.8600, label: 'University' },
  { lat: 19.0950, lng: 72.8820, label: 'Harbor Point' },
  { lat: 19.0600, lng: 72.8750, label: 'Old Town' },
];

// Bounding box for the map projection
const MIN_LAT = 19.055;
const MAX_LAT = 19.100;
const MIN_LNG = 72.855;
const MAX_LNG = 72.900;

export function projectToXY(point: GeoPoint, width: number, height: number) {
  const x = ((point.lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * width;
  const y = ((MAX_LAT - point.lat) / (MAX_LAT - MIN_LAT)) * height;
  return { x, y };
}

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Fare calculation: base + per-meter, with a minimum.
export function calculateFare(distanceMeters: number): number {
  const base = 30;
  const perKm = 12;
  return Math.max(base, Math.round(base + (distanceMeters / 1000) * perKm));
}

export function totalRouteDistance(
  stops: GeoPoint[]
): number {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    total += haversineMeters(stops[i], stops[i + 1]);
  }
  return total;
}

// Fare split: each passenger pays proportional to the distance of their leg.
export function splitFare(
  boarding: GeoPoint,
  dropoff: GeoPoint,
  routeStops: GeoPoint[],
  totalFare: number
): number {
  // proportion = passenger's direct distance / sum of all passenger distances (approx)
  // Simplified: proportional to their own ride distance vs total route.
  const myDist = haversineMeters(boarding, dropoff);
  const routeDist = totalRouteDistance(routeStops) || 1;
  const proportion = Math.min(1, myDist / routeDist);
  return Math.max(10, Math.round(totalFare * proportion));
}
