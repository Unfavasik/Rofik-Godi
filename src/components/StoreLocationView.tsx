import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigatr } from '@navigatr/web';
import type { NavigatrMap, NavigatrMarker } from '@navigatr/web';
import { ArrowLeft, ArrowRight, Bike, Car, Crosshair, Footprints, MapPin, Star, X } from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';

const STORE_IMAGE = '/images/rofik-godi-store.webp';
const BRAND_ICON = '/images/rofik-center-splash.webp';
const MAP_CONTAINER_ID = 'store-location-map-host';

type LatLng = { lat: number; lng: number };
type TravelModeKey = 'drive' | 'bike' | 'walk';
type LegInfo = { durationText: string; distanceText: string };

// The MapLibre map is cached across mounts: NavigatrMap exposes no destroy API,
// so re-creating it on every visit would leak a WebGL context per open. The
// host element is detached on unmount and re-attached on the next visit.
let cachedMap: NavigatrMap | null = null;
let cachedHost: HTMLDivElement | null = null;
let cachedStoreMarker: NavigatrMarker | null = null;
let cachedUserMarker: NavigatrMarker | null = null;

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

const googleDirectionsUrl = (mode: TravelModeKey, store: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}&travelmode=${mode === 'drive' ? 'driving' : mode === 'bike' ? 'bicycling' : 'walking'}`;

// Callout card + red pin stacked above an invisible spacer: MapLibre centers
// the marker element on the coordinate, so the spacer keeps the pin tip on it.
const storeMarkerHtml = () => `
  <div style="display:flex;flex-direction:column;align-items:center;">
    <div style="display:flex;align-items:center;gap:8px;background:#ffffff;border-radius:14px;padding:7px 12px;box-shadow:0 4px 16px rgba(0,0,0,0.22);white-space:nowrap;">
      <img src="${BRAND_ICON}" alt="" style="width:28px;height:28px;border-radius:8px;object-fit:cover;" />
      <div>
        <div style="font-size:12px;font-weight:800;color:#0f172a;line-height:1.25;">Rofik Godi Centre</div>
        <div style="font-size:8px;font-weight:700;letter-spacing:0.12em;color:#94a3b8;">BIKE &bull; TOTO &bull; SEAT COVERS</div>
      </div>
    </div>
    <svg width="26" height="34" viewBox="0 0 24 32" style="margin-top:2px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3));">
      <path d="M12 0C5.4 0 0 5.2 0 11.6 0 20.3 12 32 12 32s12-11.7 12-20.4C24 5.2 18.6 0 12 0z" fill="#E51E2B"/>
      <circle cx="12" cy="11.5" r="4.5" fill="#ffffff"/>
    </svg>
    <div style="height:80px;" aria-hidden="true"></div>
  </div>`;

const userMarkerHtml = () =>
  '<div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #ffffff;box-shadow:0 1px 6px rgba(0,0,0,0.35);"></div>';

export function StoreLocationView({ onClose }: { onClose: () => void }) {
  const hostWrapperRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<Navigatr | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [storePos, setStorePos] = useState<LatLng>({ lat: WORKSHOP_INFO.lat, lng: WORKSHOP_INFO.lng });
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [activeMode, setActiveMode] = useState<TravelModeKey>('drive');
  const [legs, setLegs] = useState<Record<TravelModeKey, LegInfo | null>>({ drive: null, bike: null, walk: null });
  const [routeLoading, setRouteLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const fallbackLegs = useMemo(() => {
    if (!userPos) return null;
    const km = haversineKm(userPos, storePos);
    return {
      drive: estimateLeg(km, 20),
      bike: estimateLeg(km, 15),
      walk: estimateLeg(km, 4.5),
    } satisfies Record<TravelModeKey, LegInfo>;
  }, [userPos, storePos]);

  const stopNavigation = useCallback(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    cachedMap?.stopNavigation();
    cachedMap?.clearRoute();
    setNavigating(false);
  }, []);

  const fetchTravelTimes = useCallback(async (nav: Navigatr, user: LatLng, store: LatLng) => {
    const results = await Promise.allSettled(
      (['drive', 'bike', 'walk'] as TravelModeKey[]).map(async (mode) => {
        const route = await nav.route({ origin: user, destination: store, mode });
        return { mode, durationText: route.durationText, distanceText: route.distanceText };
      }),
    );
    setLegs((current) => {
      const next = { ...current };
      results.forEach((result) => {
        if (result.status === 'fulfilled') next[result.value.mode] = { durationText: result.value.durationText, distanceText: result.value.distanceText };
      });
      return next;
    });
  }, []);

  const trackLivePosition = useCallback((onPosition: (position: LatLng) => void) => {
    if (!('geolocation' in navigator)) return;
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => onPosition({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }, []);

  // Boot (or re-attach) the cached map, place the store marker, refine the
  // position by geocoding the workshop address, then pick up the user's
  // location for live travel times.
  useEffect(() => {
    const wrapper = hostWrapperRef.current;
    if (!wrapper) return;
    let cancelled = false;

    if (!cachedHost) {
      cachedHost = document.createElement('div');
      cachedHost.id = MAP_CONTAINER_ID;
      cachedHost.style.cssText = 'position:absolute;inset:0;';
    }
    wrapper.appendChild(cachedHost);

    const boot = async () => {
      try {
        const nav = navRef.current || new Navigatr();
        navRef.current = nav;
        if (!cachedMap) {
          // MapLibre accepts an HTMLElement container at runtime; the SDK type
          // only declares the string id form.
          cachedMap = nav.map({
            container: cachedHost as unknown as string,
            center: { lat: WORKSHOP_INFO.lat, lng: WORKSHOP_INFO.lng },
            zoom: 15,
          });
        }
        if (cancelled) return;
        cachedStoreMarker?.remove();
        cachedStoreMarker = cachedMap.addMarker({
          lat: WORKSHOP_INFO.lat,
          lng: WORKSHOP_INFO.lng,
          iconHtml: storeMarkerHtml(),
        });
        setMapReady(true);

        const geocoded = await nav.geocode({ address: WORKSHOP_INFO.address }).catch(() => null);
        if (cancelled || !geocoded) return;
        const refined = { lat: geocoded.lat, lng: geocoded.lng };
        setStorePos(refined);
        cachedStoreMarker?.setLatLng(refined);
        cachedMap.panTo(refined);
      } catch (error) {
        if (!cancelled) setMapError(error instanceof Error ? error.message : 'The map could not be loaded.');
      }
    };
    void boot();

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      cachedUserMarker?.remove();
      cachedUserMarker = null;
      if (cachedHost && cachedHost.parentElement === wrapper) wrapper.removeChild(cachedHost);
    };
  }, []);

  // Ask for the visitor's location once the map exists; show the live dot and
  // fetch drive/bike/walk ETAs from the Valhalla router.
  useEffect(() => {
    if (!mapReady || !('geolocation' in navigator)) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const user = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserPos(user);
        const nav = navRef.current;
        const map = cachedMap;
        if (!nav || !map) return;
        cachedUserMarker?.remove();
        cachedUserMarker = map.addMarker({ lat: user.lat, lng: user.lng, iconHtml: userMarkerHtml() });
        void fetchTravelTimes(nav, user, storePos);
      },
      () => undefined,
      { timeout: 8000, maximumAge: 120000 },
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  const handleLocate = () => {
    const map = cachedMap;
    if (!map) return;
    if (userPos) {
      map.panTo(userPos);
      return;
    }
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const user = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserPos(user);
        cachedUserMarker?.remove();
        cachedUserMarker = map.addMarker({ lat: user.lat, lng: user.lng, iconHtml: userMarkerHtml() });
        map.panTo(user);
        const nav = navRef.current;
        if (nav) void fetchTravelTimes(nav, user, storePos);
      },
      () => undefined,
      { timeout: 8000, maximumAge: 120000 },
    );
  };

  const handleGetDirections = async () => {
    const nav = navRef.current;
    if (!nav || !cachedMap || !userPos) {
      window.open(googleDirectionsUrl(activeMode, storePos), '_blank');
      return;
    }
    setRouteLoading(true);
    try {
      const route = await nav.route({ origin: userPos, destination: storePos, mode: activeMode });
      cachedMap.drawRoute(route.polyline, { color: '#2563EB', weight: 6 });
      cachedMap.fitRoute(route.polyline);
      cachedMap.startNavigation(route);
      setNavigating(true);
      trackLivePosition((position) => {
        cachedMap?.updatePosition(position);
        setUserPos(position);
      });
    } catch {
      // Public Valhalla can be briefly unavailable; Google Maps still gets the user there.
      window.open(googleDirectionsUrl(activeMode, storePos), '_blank');
    } finally {
      setRouteLoading(false);
    }
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
        <div ref={hostWrapperRef} className="absolute inset-0" />
        {mapError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#E8EDF3] px-6 text-center">
            <MapPin className="h-10 w-10 text-[#D9232D]" />
            <p className="text-sm font-bold text-slate-800">The map could not be loaded</p>
            <p className="max-w-[280px] text-xs leading-relaxed text-slate-500">{mapError}. Please check your connection and try again.</p>
          </div>
        )}
        {navigating && (
          <button
            type="button"
            onClick={stopNavigation}
            className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-white shadow-lg transition-transform active:scale-95"
          >
            <X className="h-3.5 w-3.5" /> Exit navigation
          </button>
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

          <button
            type="button"
            onClick={() => void handleGetDirections()}
            disabled={routeLoading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E51E2B] py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(229,30,43,0.3)] transition-colors hover:bg-[#C81E28] active:scale-[0.99] disabled:opacity-70"
          >
            {routeLoading ? 'Finding route…' : 'Get Directions'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
