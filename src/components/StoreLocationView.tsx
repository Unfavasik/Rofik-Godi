import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Bike, Car, Crosshair, Footprints, MapPin, Star } from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || '';
const STORE_IMAGE = '/images/rofik-godi-store.webp';
const BRAND_ICON = '/images/rofik-center-splash.webp';

type LatLng = { lat: number; lng: number };
type TravelModeKey = 'drive' | 'bike' | 'walk';

type LegInfo = { durationText: string; distanceText: string };

declare global {
  interface Window {
    google?: typeof google;
    __rofikGoogleMapsReady?: () => void;
  }
}

let mapsPromise: Promise<typeof google.maps> | null = null;

// Uses the callback bootstrap (not loading=async) so the full legacy
// namespace — LatLng, Marker, InfoWindow, Geocoder, DistanceMatrixService —
// is available on window.google.maps once the script reports ready.
function loadGoogleMaps(apiKey: string): Promise<typeof google.maps> {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    window.__rofikGoogleMapsReady = () => {
      if (window.google?.maps?.Map) resolve(window.google.maps);
      else reject(new Error('Google Maps unavailable'));
    };
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&callback=__rofikGoogleMapsReady`;
    script.async = true;
    script.onerror = () => reject(new Error('Google Maps unavailable'));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

const haversineKm = (from: LatLng, to: LatLng) => {
  const radius = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatKm = (km: number) => (km < 1 ? `${Math.max(1, Math.round(km * 10) * 100)} m` : `${km.toFixed(1)} km`);

const estimateLeg = (km: number, speedKmh: number): LegInfo => ({
  durationText: `${Math.max(1, Math.round((km / speedKmh) * 60))} min`,
  distanceText: formatKm(km),
});

const travelModes: { key: TravelModeKey; label: string; icon: React.ComponentType<{ className?: string }>; speedKmh: number }[] = [
  { key: 'drive', label: 'drive', icon: Car, speedKmh: 20 },
  { key: 'bike', label: 'bike', icon: Bike, speedKmh: 15 },
  { key: 'walk', label: 'walk', icon: Footprints, speedKmh: 4.5 },
];

const directionsUrl = (mode: TravelModeKey, store: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}&travelmode=${mode === 'drive' ? 'driving' : mode === 'bike' ? 'bicycling' : 'walking'}`;

const calloutHtml = () => `
  <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;min-width:190px;font-family:inherit;">
    <img src="${BRAND_ICON}" alt="" style="width:30px;height:30px;border-radius:8px;object-fit:cover;flex-shrink:0;" />
    <div style="min-width:0;">
      <div style="font-size:12.5px;font-weight:800;color:#0f172a;white-space:nowrap;">Rofik Godi Centre</div>
      <div style="font-size:8.5px;font-weight:700;letter-spacing:0.14em;color:#94a3b8;white-space:nowrap;">BIKE &bull; TOTO &bull; SEAT COVERS</div>
    </div>
  </div>`;

export function StoreLocationView({ onClose }: { onClose: () => void }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const googleRef = useRef<typeof google.maps | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const [storePos, setStorePos] = useState<LatLng>({ lat: WORKSHOP_INFO.lat, lng: WORKSHOP_INFO.lng });
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [activeMode, setActiveMode] = useState<TravelModeKey>('drive');
  const [legs, setLegs] = useState<Record<TravelModeKey, LegInfo | null>>({ drive: null, bike: null, walk: null });

  const fallbackLegs = useMemo(() => {
    const km = userPos ? haversineKm(userPos, storePos) : null;
    if (km === null) return null;
    return {
      drive: estimateLeg(km, 20),
      bike: estimateLeg(km, 15),
      walk: estimateLeg(km, 4.5),
    } satisfies Record<TravelModeKey, LegInfo>;
  }, [userPos, storePos]);

  const fitToStoreAndUser = useCallback((maps: typeof google.maps, user: LatLng | null, store: LatLng) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (user) {
      const bounds = new maps.LatLngBounds();
      bounds.extend(new maps.LatLng(user.lat, user.lng));
      bounds.extend(new maps.LatLng(store.lat, store.lng));
      map.fitBounds(bounds, 64);
      return;
    }
    map.panTo(new maps.LatLng(store.lat, store.lng));
    map.setZoom(15);
  }, []);

  const fetchTravelTimes = useCallback((maps: typeof google.maps, user: LatLng, store: LatLng) => {
    const service = new maps.DistanceMatrixService();
    const requests: { key: TravelModeKey; mode: google.maps.TravelMode }[] = [
      { key: 'drive', mode: maps.TravelMode.DRIVING },
      { key: 'bike', mode: maps.TravelMode.BICYCLING },
      { key: 'walk', mode: maps.TravelMode.WALKING },
    ];
    requests.forEach(({ key, mode }) => {
      service.getDistanceMatrix(
        {
          origins: [new maps.LatLng(user.lat, user.lng)],
          destinations: [new maps.LatLng(store.lat, store.lng)],
          travelMode: mode,
        },
        (response, status) => {
          if (status !== maps.DistanceMatrixStatus.OK) return;
          const element = response?.rows?.[0]?.elements?.[0];
          if (!element || element.status !== 'OK') return;
          setLegs((current) => ({
            ...current,
            [key]: { durationText: element.duration?.text || '', distanceText: element.distance?.text || '' },
          }));
        },
      );
    });
  }, []);

  // Boot the map: load the SDK, place the store marker, refine the position by
  // geocoding the workshop address, then pick up the visitor's location.
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then((maps) => {
        if (cancelled || !mapRef.current) return;
        googleRef.current = maps;
        const map = new maps.Map(mapRef.current, {
          center: new maps.LatLng(WORKSHOP_INFO.lat, WORKSHOP_INFO.lng),
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapInstanceRef.current = map;
        const marker = new maps.Marker({
          map,
          position: new maps.LatLng(WORKSHOP_INFO.lat, WORKSHOP_INFO.lng),
          title: WORKSHOP_INFO.name,
        });
        markerRef.current = marker;
        const infoWindow = new maps.InfoWindow({ content: calloutHtml(), disableAutoPan: true });
        infoWindow.open({ map, anchor: marker });
        setMapReady(true);

        const geocoder = new maps.Geocoder();
        geocoder.geocode({ address: WORKSHOP_INFO.address }, (results, status) => {
          if (cancelled || status !== maps.GeocoderStatus.OK || !results?.[0]) return;
          const location = results[0].geometry.location;
          const refined = { lat: location.lat(), lng: location.lng() };
          setStorePos(refined);
          marker.setPosition(new maps.LatLng(refined.lat, refined.lng));
          fitToStoreAndUser(maps, userMarkerRef.current ? userPos : null, refined);
        });
      })
      .catch((error) => {
        if (!cancelled) setMapError(error instanceof Error ? error.message : 'Google Maps could not be loaded.');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [GOOGLE_MAPS_API_KEY]);

  // Ask for the visitor's location once the map exists; refine ETAs when granted.
  useEffect(() => {
    if (!mapReady || !('geolocation' in navigator)) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const user = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserPos(user);
        const maps = googleRef.current;
        if (!maps) return;
        if (userMarkerRef.current) userMarkerRef.current.setMap(null);
        userMarkerRef.current = new maps.Marker({
          map: mapInstanceRef.current,
          position: new maps.LatLng(user.lat, user.lng),
          title: 'You are here',
        });
        fitToStoreAndUser(maps, user, storePos);
        fetchTravelTimes(maps, user, storePos);
      },
      () => undefined,
      { timeout: 8000, maximumAge: 120000 },
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  const handleLocate = () => {
    const maps = googleRef.current;
    if (!maps) return;
    if (userPos) {
      fitToStoreAndUser(maps, userPos, storePos);
      return;
    }
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const user = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserPos(user);
        if (userMarkerRef.current) userMarkerRef.current.setMap(null);
        userMarkerRef.current = new maps.Marker({
          map: mapInstanceRef.current,
          position: new maps.LatLng(user.lat, user.lng),
          title: 'You are here',
        });
        fitToStoreAndUser(maps, user, storePos);
        fetchTravelTimes(maps, user, storePos);
      },
      () => undefined,
      { timeout: 8000, maximumAge: 120000 },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8FAFC] font-sans" role="dialog" aria-modal="true" aria-label="Visit our store">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Go back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100/80 text-slate-700 transition-transform hover:bg-slate-200/80 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <img src={BRAND_ICON} alt="" className="h-9 w-9 rounded-lg object-cover" />
        <div className="min-w-0">
          <h1 className="truncate text-base font-black leading-tight tracking-tight text-slate-900">ROFIK GODI CENTRE</h1>
          <p className="text-[9px] font-bold tracking-[0.18em] text-slate-400">BIKE &bull; TOTO &bull; SEAT COVERS</p>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={mapRef} className="absolute inset-0" aria-hidden="true" />
        {!GOOGLE_MAPS_API_KEY && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#E8EDF3] px-6 text-center">
            <MapPin className="h-10 w-10 text-[#D9232D]" />
            <p className="text-sm font-bold text-slate-800">Map preview needs the Google Maps API key</p>
            <p className="max-w-[280px] text-xs leading-relaxed text-slate-500">Add GOOGLE_MAPS_API_KEY in project settings to see the live map. Directions still work below.</p>
          </div>
        )}
        {GOOGLE_MAPS_API_KEY && mapError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#E8EDF3] px-6 text-center">
            <MapPin className="h-10 w-10 text-[#D9232D]" />
            <p className="text-sm font-bold text-slate-800">The map could not be loaded</p>
            <p className="max-w-[280px] text-xs leading-relaxed text-slate-500">{mapError}. Check the API key and billing, or use Get Directions below.</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLocate}
          aria-label="Show my location"
          className="absolute bottom-5 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition-transform active:scale-95"
        >
          <Crosshair className="h-5 w-5" />
        </button>
      </div>

      <section className="relative z-10 -mt-5 shrink-0 rounded-t-[28px] bg-white px-4 pb-5 pt-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="mx-auto w-full max-w-[440px]">
          <div className="flex items-start gap-3">
            <img src={STORE_IMAGE} alt="Rofik Godi Centre storefront" className="h-16 w-16 shrink-0 rounded-2xl border border-slate-100 object-cover" />
            <div className="min-w-0">
              <h2 className="text-base font-black tracking-tight text-slate-900">Rofik Godi Centre</h2>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-slate-900">{WORKSHOP_INFO.rating}</span>
                <span className="text-slate-400">({WORKSHOP_INFO.reviewCount} reviews)</span>
              </p>
              <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-slate-500">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{WORKSHOP_INFO.address}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2" role="tablist" aria-label="Travel mode">
            {travelModes.map(({ key, label, icon: Icon }) => {
              const leg = legs[key] || fallbackLegs?.[key] || null;
              const selected = activeMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveMode(key)}
                  className={`flex min-h-[76px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2.5 text-center transition-colors ${selected ? 'bg-[#E51E2B] text-white shadow-[0_6px_16px_rgba(229,30,43,0.3)]' : 'border border-slate-200 bg-white text-slate-800'}`}
                >
                  <span className="flex items-center gap-1">
                    <Icon className={`h-4 w-4 ${selected ? 'text-white' : 'text-[#E51E2B]'}`} />
                    <span className="text-[11px] font-bold">{label}</span>
                  </span>
                  <span className={`text-[11px] font-bold ${selected ? 'text-white' : 'text-slate-900'}`}>{leg?.durationText || '--'}</span>
                  <span className={`text-[10px] ${selected ? 'text-white/85' : 'text-slate-400'}`}>{leg?.distanceText || '--'}</span>
                </button>
              );
            })}
          </div>

          <a
            href={directionsUrl(activeMode, storePos)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E51E2B] py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(229,30,43,0.3)] transition-colors hover:bg-[#C81E28] active:scale-[0.99]"
          >
            Get Directions
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
