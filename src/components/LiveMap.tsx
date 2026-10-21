import { useMemo, useState, useEffect, useRef } from 'react';
import { projectToXY, type GeoPoint } from '@/lib/geo';

interface MapMarker {
  point: GeoPoint;
  type: 'pickup' | 'dropoff' | 'passenger' | 'stop';
  label?: string;
}

interface LiveMapProps {
  stops: GeoPoint[]; // ordered route stops (pickup → passenger stops → dropoff)
  markers?: MapMarker[];
  autoPosition?: GeoPoint | null;
  height?: number;
  showAuto?: boolean;
}

const COLORS = {
  bg: '#0b1620',
  grid: 'rgba(56,189,248,0.06)',
  road: 'rgba(148,163,184,0.12)',
  route: '#22d3ee',
  routeGlow: 'rgba(34,211,238,0.25)',
  pickup: '#34d399',
  dropoff: '#f43f5e',
  passenger: '#fbbf24',
  stop: '#94a3b8',
  auto: '#22d3ee',
};

export default function LiveMap({
  stops,
  markers = [],
  autoPosition,
  height = 320,
  showAuto = false,
}: LiveMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 480;
  const H = 360;
  const [tick, setTick] = useState(0);

  // animate
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(i);
  }, []);

  const routeXY = useMemo(
    () => stops.map((s) => projectToXY(s, W, H)),
    [stops]
  );

  const autoXY = useMemo(() => {
    if (!autoPosition || stops.length < 2) return null;
    // simulate progress along the route
    const t = ((tick * 0.5) % 100) / 100;
    const segCount = stops.length - 1;
    const segFloat = t * segCount;
    const segIdx = Math.floor(segFloat);
    const segT = segFloat - segIdx;
    if (segIdx >= segCount) {
      return projectToXY(stops[stops.length - 1], W, H);
    }
    const a = projectToXY(stops[segIdx], W, H);
    const b = projectToXY(stops[segIdx + 1], W, H);
    return { x: a.x + (b.x - a.x) * segT, y: a.y + (b.y - a.y) * segT };
  }, [autoPosition, stops, tick]);

  // build road network grid
  const roads = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i <= 8; i++) {
      const x = (W / 8) * i;
      lines.push({ x1: x, y1: 0, x2: x, y2: H });
      const y = (H / 6) * i;
      lines.push({ x1: 0, y1: y, x2: W, y2: y });
    }
    return lines;
  }, []);

  const markerXY = markers.map((m) => ({
    ...m,
    pos: projectToXY(m.point, W, H),
  }));

  const routePath = routeXY.length
    ? routeXY.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-900"
      style={{ height }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={W} height={H} fill={COLORS.bg} />
        <rect width={W} height={H} fill="url(#mapGlow)" />

        {/* grid roads */}
        {roads.map((r, i) => (
          <line
            key={i}
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            stroke={COLORS.road}
            strokeWidth={i % 3 === 0 ? 2.5 : 1}
          />
        ))}

        {/* decorative blocks */}
        {tick >= 0 &&
          [...Array(6)].map((_, i) => {
            const bx = 40 + (i % 3) * 160;
            const by = 40 + Math.floor(i / 3) * 160;
            return (
              <rect
                key={`b${i}`}
                x={bx}
                y={by}
                width={70}
                height={50}
                rx={6}
                fill="rgba(34,211,238,0.03)"
                stroke="rgba(34,211,238,0.08)"
              />
            );
          })}

        {/* route path with glow */}
        {routePath && (
          <>
            <path
              d={routePath}
              fill="none"
              stroke={COLORS.routeGlow}
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={routePath}
              fill="none"
              stroke={COLORS.route}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="0"
              filter="url(#glow)"
            />
            {/* moving dash animation */}
            <path
              d={routePath}
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="6 14"
              strokeDashoffset={-tick * 2}
            />
          </>
        )}

        {/* markers */}
        {markerXY.map((m, i) => {
          const color =
            m.type === 'pickup'
              ? COLORS.pickup
              : m.type === 'dropoff'
              ? COLORS.dropoff
              : m.type === 'passenger'
              ? COLORS.passenger
              : COLORS.stop;
          return (
            <g key={i}>
              <circle
                cx={m.pos.x}
                cy={m.pos.y}
                r={10}
                fill={color}
                opacity={0.25}
              />
              <circle
                cx={m.pos.x}
                cy={m.pos.y}
                r={5}
                fill={color}
                stroke="#0b1620"
                strokeWidth={1.5}
              />
              {m.label && (
                <text
                  x={m.pos.x}
                  y={m.pos.y - 12}
                  fill="#e2e8f0"
                  fontSize={9}
                  textAnchor="middle"
                  className="font-medium"
                >
                  {m.label}
                </text>
              )}
            </g>
          );
        })}

        {/* auto rickshaw icon */}
        {showAuto && autoXY && (
          <g transform={`translate(${autoXY.x}, ${autoXY.y})`}>
            <circle r={14} fill={COLORS.auto} opacity={0.3} className="animate-ping" />
            <circle r={9} fill={COLORS.auto} opacity={0.2} />
            <g>
              <circle r={6} fill="#0b1620" stroke={COLORS.auto} strokeWidth={2.5} />
              <path d="M -3 -1 L 3 -1 L 2 3 L -2 3 Z" fill={COLORS.auto} />
              <circle cx={0} cy={-1} r={1.5} fill="#fff" />
            </g>
          </g>
        )}
      </svg>

      <div className="absolute top-2 left-2 flex gap-3 text-[10px] font-medium">
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> Pickup
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> Co-passenger
        </span>
        <span className="flex items-center gap-1 text-rose-400">
          <span className="w-2 h-2 rounded-full bg-rose-400" /> Drop
        </span>
      </div>
    </div>
  );
}
