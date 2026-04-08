"use client";

import { useEffect, useRef, useState } from "react";

type HeatmapData = {
  points: { lat: number; lng: number }[];
  regions: { name: string; count: number }[];
  total: number;
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    initBrazilMap?: () => void;
  }
}

const BRAZIL_CENTER = { lat: -14.235, lng: -51.925 };
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export function BrazilMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapsReady, setMapsReady] = useState(false);

  // Busca pontos do heatmap
  useEffect(() => {
    fetch("/api/geo/heatmap")
      .then((r) => r.json())
      .then((d: HeatmapData) => setData(d))
      .catch(() => setData({ points: [], regions: [], total: 0 }))
      .finally(() => setLoading(false));
  }, []);

  // Carrega Google Maps Script
  useEffect(() => {
    if (!MAPS_API_KEY) {
      setMapsReady(false);
      return;
    }
    if (typeof window.google !== "undefined") {
      setMapsReady(true);
      return;
    }

    window.initBrazilMap = () => setMapsReady(true);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=visualization&callback=initBrazilMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // Inicializa mapa quando tudo estiver pronto
  useEffect(() => {
    if (!mapsReady || !mapRef.current || !data || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: BRAZIL_CENTER,
      zoom: 4,
      mapTypeId: "roadmap",
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "cooperative",
      styles: darkMapStyles,
      restriction: {
        latLngBounds: { north: 6, south: -34, east: -28, west: -75 },
        strictBounds: false,
      },
    });

    mapInstanceRef.current = map;

    if (data.points.length > 0) {
      const heatmapData = data.points.map(
        (p) => new google.maps.LatLng(p.lat, p.lng)
      );

      new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map,
        radius: 30,
        opacity: 0.85,
        gradient: [
          "rgba(0,0,0,0)",
          "rgba(220,38,38,0.3)",
          "rgba(220,38,38,0.6)",
          "rgba(239,68,68,0.8)",
          "rgba(252,165,165,1)",
          "rgba(255,255,255,1)",
        ],
      });
    }
  }, [mapsReady, data]);

  const noKey = !MAPS_API_KEY;

  return (
    <div className="relative w-full">
      {/* Mapa */}
      <div
        ref={mapRef}
        className="w-full h-[500px] md:h-[600px] rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800"
      >
        {(loading || (!mapsReady && !noKey)) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-500 text-sm font-medium">
                Carregando mapa...
              </p>
            </div>
          </div>
        )}

        {noKey && !loading && (
          <FallbackMap data={data} />
        )}
      </div>

      {/* Legenda + stats */}
      {data && data.total > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.regions.slice(0, 4).map((r) => (
            <div
              key={r.name}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center"
            >
              <div className="text-2xl font-black text-rose-400">{r.count}</div>
              <div className="text-xs text-zinc-500 font-bold mt-1 truncate">{r.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* Badge total */}
      {data && (
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-zinc-700 rounded-2xl px-4 py-2.5 pointer-events-none">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
            Registros
          </p>
          <p className="text-xl font-black text-rose-400">
            {data.total.toLocaleString("pt-BR")}
          </p>
        </div>
      )}
    </div>
  );
}

// Fallback SVG quando não há Google Maps API key
function FallbackMap({ data }: { data: HeatmapData | null }) {
  // Mapa SVG simplificado do Brasil com pontos
  const brasilPoints = data?.points ?? [];

  // Converte lat/lng para coordenadas SVG (viewport 800x700)
  function toSvg(lat: number, lng: number): { x: number; y: number } {
    const x = ((lng - -75) / (-28 - -75)) * 800;
    const y = ((lat - 6) / (-34 - 6)) * 700;
    return { x: Math.max(0, Math.min(800, x)), y: Math.max(0, Math.min(700, y)) };
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
      <div className="relative w-full h-full">
        <svg
          viewBox="0 0 800 700"
          className="w-full h-full opacity-90"
          style={{ filter: "drop-shadow(0 0 20px rgba(220,38,38,0.2))" }}
        >
          {/* Fundo escuro */}
          <rect width="800" height="700" fill="#09090b" rx="24" />

          {/* Grid sutil */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="pointGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(220,38,38,0.9)" />
              <stop offset="100%" stopColor="rgba(220,38,38,0)" />
            </radialGradient>
          </defs>
          <rect width="800" height="700" fill="url(#grid)" />

          {/* Contorno aproximado do Brasil */}
          <path
            d="M 390 60 L 430 55 L 490 70 L 540 65 L 580 80 L 620 95 L 650 120 L 670 150 L 680 185 L 670 220 L 690 250 L 710 270 L 700 310 L 680 340 L 660 370 L 640 400 L 600 430 L 570 460 L 540 490 L 510 510 L 480 530 L 450 545 L 420 555 L 390 565 L 360 560 L 330 545 L 300 525 L 275 500 L 250 475 L 230 445 L 215 415 L 200 385 L 195 355 L 190 325 L 185 295 L 175 265 L 165 235 L 160 205 L 170 175 L 185 150 L 210 130 L 240 115 L 280 100 L 320 80 L 360 65 Z"
            fill="rgba(39,39,42,0.6)"
            stroke="rgba(63,63,70,0.8)"
            strokeWidth="1.5"
          />

          {/* Pontos do heatmap */}
          {brasilPoints.slice(0, 200).map((p, i) => {
            const { x, y } = toSvg(p.lat, p.lng);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="12" fill="url(#pointGlow)" opacity="0.4" />
                <circle cx={x} cy={y} r="3" fill="rgba(220,38,38,0.9)" />
              </g>
            );
          })}

          {/* Label */}
          <text
            x="400"
            y="630"
            textAnchor="middle"
            fill="rgba(113,113,122,0.8)"
            fontSize="11"
            fontFamily="sans-serif"
            fontWeight="600"
            letterSpacing="2"
          >
            BRASIL — PEDIDOS ANONIMIZADOS
          </text>
        </svg>

        {/* Overlay quando sem API key */}
        <div className="absolute bottom-12 right-4 bg-black/70 border border-zinc-700 rounded-xl px-3 py-2">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </p>
          <p className="text-[10px] text-zinc-600">para mapa interativo</p>
        </div>
      </div>
    </div>
  );
}

const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#09090b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#09090b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#52525b" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#27272a" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3f3f46" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#18181b" }],
  },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#52525b" }] },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#18181b" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1c1c1e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#000000" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#27272a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#000000" }],
  },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#18181b" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#050507" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#27272a" }],
  },
];
