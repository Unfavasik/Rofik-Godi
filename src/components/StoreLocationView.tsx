import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigatr } from '@navigatr/web';
import type { NavigatrMap, NavigatrMarker, RouteResult } from '@navigatr/web';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bike,
  Car,
  CornerUpLeft,
  CornerUpRight,
  Crosshair,
  Flag,
  Footprints,
  MapPin,
  RotateCw,
  Star,
  TriangleAlert,
  X,
} from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';

const STORE_IMAGE = '/images/rofik-godi-store.webp';
const BRAND_ICON = '/images/rofik-center-splash.webp';
const MAP_CONTAINER_ID = 'store-location-map-host';
const ROUTE_TIMEOUT_MS = 15000;

type LatLng = { lat: number; lng: number };
type TravelModeKey = 'drive' | 'bike' | 'walk';
type LegInfo = { durationText: string; distanceText: string };
type Maneuver = { instruction: string; type: string; distanceText: string; distanceMeters: number };

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

const formatMeters = (meters: number) => (meters < 1000 ? `${Math.max(10, Math.round(meters / 10) * 10)} m` : `${(meters / 1000).toFixed(1)} km`);

const estimateLeg = (km: number, speedKmh: number): LegInfo => ({
  durationText: `${Math.max(1, Math.round((km / speedKmh) * 60))} min`,
  distanceText: formatKm(km),
});

const travelModes: { key: TravelModeKey; label: string; icon: React.ComponentType<{ className?: string }>; speedKmh: number }[] = [
  { key: 'drive', label: 'drive', icon: Car, speedKmh: 20 },
  { key: 'bike', label: 'bike', icon: Bike, speedKmh: 15 },
  { key: 'walk', label: 'walk', icon: Footprints, speedKmh: 4.5 },
];

const driverIconFor = (mode: TravelModeKey) => (mode === 'drive' ? 'car' : mode === 'bike' ? 'bike' : 'walk') as 'car' | 'bike' | 'walk';

const googleDirectionsUrl = (mode: TravelModeKey, store: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}&travelmode=${mode === 'drive' ? 'driving' : mode === 'bike' ? 'bicycling' : 'walking'}`;

const maneuverIcon = (type: string): React.ComponentType<{ className?: string; strokeWidth?: number }> => {
  if (type.includes('right')) return CornerUpRight;
  if (type.includes('left')) return CornerUpLeft;
  if (type.startsWith('destination')) return Flag;
  if (type.includes('roundabout')) return RotateCw;
  return ArrowUp;
};

const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);

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

const getCurrentPosition = (): Promise<LatLng> =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not available on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(new Error(error.code === error.PERMISSION_DENIED ? 'Location permission is turned off' : 'Location could not be determined')),
      { timeout: 10000, maximumAge: 30000, enableHighAccuracy: true },
    );
  });

export function StoreLocationView({ onClose }: { onClose: () => void }) {
  const hostWrapperRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<Navigatr | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const unsubscribeEventsRef = useRef<(() => void) | null>(null);
  const latestPosRef = useRef<LatLng | null>(null);
  const reroutingRef = useRef(false);
  const activeModeRef = useRef<TravelModeKey>('drive');
  const storePosRef = useRef<LatLng>({ lat: WORKSHOP_INFO.lat, lng: WORKSHOP_INFO.lng });

  const [storePos, setStorePos] = useState<LatLng>({ lat: WORKSHOP_INFO.lat, lng: WORKSHOP_INFO.lng });
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [activeMode, setActiveMode] = useState<TravelModeKey>('drive');
  const [legs, setLegs] = useState<Record<TravelModeKey, LegInfo | null>>({ drive: null, bike: null, walk: null });
  const [routeLoading, setRouteLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [navRoute, setNavRoute] = useState<RouteResult | null>(null);
  const [banner, setBanner] = useState<{ instruction: string; distance: string; type: string } | null>(null);
  const [thenManeuver, setThenManeuver] = useState<Maneuver | null>(null);
  const [arrived, setArrived] = useState(false);
  const [offRoute, setOffRoute] = useState(false);
  const [locationNeeded, setLocationNeeded] = useState(false);
  const [routeError, setRouteError] = useState('');

  activeModeRef.current = activeMode;
  storePosRef.current = storePos;

  const fallbackLegs = useMemo(() => {
    if (!userPos) return null;
    const km = haversineKm(userPos, storePos);
    return {
      drive: estimateLeg(km, 20),
      bike: estimateLeg(km, 15),
      walk: estimateLeg(km, 4.5),
    } satisfies Record<TravelModeKey, LegInfo>;
  }, [userPos, storePos]);

  const clearWatch = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  };

  const exitNavigation = useCallback(() => {
    clearWatch();
    unsubscribeEventsRef.current?.();
    unsubscribeEventsRef.current = null;
    cachedMap?.stopNavigation();
    cachedMap?.clearRoute();
    cachedMap?.removeDriverMarker();
    setNavigating(false);
    setNavRoute(null);
    setBanner(null);
    setThenManeuver(null);
    setArrived(false);
    setOffRoute(false);
  }, []);

  const fetchTravelTimes = useCallback(async (nav: Navigatr, user: LatLng, store: LatLng) => {
    const results = await Promise.allSettled(
      (['drive', 'bike', 'walk'] as TravelModeKey[]).map(async (mode) => {
        const route = await withTimeout(nav.route({ origin: user, destination: store, mode }), ROUTE_TIMEOUT_MS, 'Route');
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
    clearWatch();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => onPosition({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }, []);

  const adoptUserPosition = useCallback((user: LatLng) => {
    latestPosRef.current = user;
    setUserPos(user);
    const map = cachedMap;
    if (!map) return;
    cachedUserMarker?.remove();
    cachedUserMarker = map.addMarker({ lat: user.lat, lng: user.lng, iconHtml: userMarkerHtml() });
  }, []);

  // Boot (or re-attach) the cached map, place the store marker, refine the
  // position by geocoding the workshop address.
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
      clearWatch();
      unsubscribeEventsRef.current?.();
      unsubscribeEventsRef.current = null;
      cachedUserMarker?.remove();
      cachedUserMarker = null;
      if (cachedHost && cachedHost.parentElement === wrapper) wrapper.removeChild(cachedHost);
    };
  }, []);

  // Navigation events: upcoming turns drive the banner, leaving the route
  // triggers a re-route from the live position, arrival closes the session.
  useEffect(() => {
    if (!mapReady || !cachedMap) return;
    const unsubscribe = cachedMap.onNavigationEvent((event) => {
      if (event.type === 'turn_approaching') {
        setBanner({ instruction: event.maneuver.instruction, distance: formatMeters(event.distanceMeters), type: event.maneuver.type });
        const maneuvers = navRoute?.maneuvers || [];
        const index = maneuvers.findIndex((m) => m.instruction === event.maneuver.instruction);
        setThenManeuver(index >= 0 ? maneuvers[index + 1] || null : null);
        return;
      }
      if (event.type === 'arrived') {
        setArrived(true);
        setBanner(null);
        clearWatch();
        window.setTimeout(() => exitNavigation(), 3000);
        return;
      }
      if (event.type === 'off_route') {
        setOffRoute(true);
        if (reroutingRef.current) return;
        reroutingRef.current = true;
        void (async () => {
          try {
            const nav = navRef.current;
            const origin = latestPosRef.current;
            if (!nav || !origin || !cachedMap) return;
            const route = await withTimeout(nav.route({ origin, destination: storePosRef.current, mode: activeModeRef.current, maneuvers: true }), ROUTE_TIMEOUT_MS, 'Route');
            if (!reroutingRef.current) return;
            cachedMap.drawRoute(route.polyline, { color: '#2563EB', weight: 6 });
            cachedMap.startNavigation(route);
            setNavRoute(route);
            setOffRoute(false);
          } catch {
            // Keep guiding with the old line; the next position update retries.
          } finally {
            window.setTimeout(() => { reroutingRef.current = false; }, 8000);
          }
        })();
      }
    });
    return unsubscribe;
  }, [mapReady, navRoute, exitNavigation]);

  // Pick up the visitor's location once the map exists for the ETA cards.
  useEffect(() => {
    if (!mapReady) return;
    let cancelled = false;
    getCurrentPosition()
      .then((user) => {
        if (cancelled) return;
        adoptUserPosition(user);
        const nav = navRef.current;
        if (nav) void fetchTravelTimes(nav, user, storePos);
      })
      .catch(() => undefined);
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
    getCurrentPosition()
      .then((user) => {
        adoptUserPosition(user);
        map.panTo(user);
        const nav = navRef.current;
        if (nav) void fetchTravelTimes(nav, user, storePos);
      })
      .catch(() => undefined);
  };

  const startTurnByTurn = useCallback(async (origin: LatLng) => {
    const nav = navRef.current;
    const map = cachedMap;
    if (!nav || !map) return;
    setRouteLoading(true);
    setRouteError('');
    try {
      const route = await withTimeout(nav.route({ origin, destination: storePosRef.current, mode: activeModeRef.current, maneuvers: true }), ROUTE_TIMEOUT_MS, 'Route');
      map.drawRoute(route.polyline, { color: '#2563EB', weight: 6 });
      map.fitRoute(route.polyline);
      map.startNavigation(route);
      map.updateDriverMarker({ lat: origin.lat, lng: origin.lng, icon: driverIconFor(activeModeRef.current) });
      const first = route.maneuvers?.[0] || null;
      setNavRoute(route);
      setBanner(first ? { instruction: first.instruction, distance: first.distanceText, type: first.type } : null);
      setThenManeuver(route.maneuvers?.[1] || null);
      setNavigating(true);
      trackLivePosition((position) => {
        latestPosRef.current = position;
        setUserPos(position);
        map.updatePosition(position);
      });
    } catch (error) {
      setRouteError(error instanceof Error && error.message.includes('timed out')
        ? 'The routing service is slow right now. Please try again.'
        : 'The route could not be calculated. Check your connection and try again.');
    } finally {
      setRouteLoading(false);
    }
  }, [trackLivePosition]);

  const handleGetDirections = async () => {
    if (navigating) {
      exitNavigation();
      return;
    }
    if (userPos) {
      await startTurnByTurn(userPos);
      return;
    }
    setRouteLoading(true);
    setRouteError('');
    try {
      const user = await getCurrentPosition();
      adoptUserPosition(user);
      const nav = navRef.current;
      if (nav) void fetchTravelTimes(nav, user, storePos);
      setLocationNeeded(false);
      await startTurnByTurn(user);
    } catch (error) {
      setLocationNeeded(true);
      setRouteError(error instanceof Error ? error.message : 'Location is needed for directions.');
    } finally {
      setRouteLoading(false);
    }
  };

  const arrivalTime = useMemo(() => {
    if (!navRoute) return null;
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(
      new Date(Date.now() + navRoute.durationSeconds * 1000),
    );
  }, [navRoute]);

  const BannerIcon = banner ? maneuverIcon(banner.type) : ArrowUp;

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

        {navigating && banner && !arrived && (
          <div className="absolute left-3 right-3 top-3 z-20" role="status" aria-live="assertive">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-900/95 p-3.5 shadow-xl">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                <BannerIcon className="h-6 w-6" strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-black leading-none text-white">{banner.distance}</p>
                <p className="mt-1 truncate text-[13px] font-medium text-white/90">{banner.instruction}</p>
              </div>
            </div>
            {thenManeuver && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-900/85 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
                Then
                {(() => {
                  const ThenIcon = maneuverIcon(thenManeuver.type);
                  return <ThenIcon className="h-3.5 w-3.5" strokeWidth={2.4} />;
                })()}
              </div>
            )}
          </div>
        )}

        {navigating && arrived && (
          <div className="absolute left-3 right-3 top-3 z-20" role="status">
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-600 p-4 shadow-xl">
              <Flag className="h-6 w-6 shrink-0 text-white" />
              <p className="text-sm font-black text-white">You have arrived — Rofik Godi Centre</p>
            </div>
          </div>
        )}

        {navigating && offRoute && !arrived && (
          <div className="absolute left-3 right-3 top-3 z-20" role="alert">
            <div className="flex items-center gap-2.5 rounded-2xl bg-amber-500 p-3 shadow-xl">
              <TriangleAlert className="h-5 w-5 shrink-0 text-white" />
              <p className="text-xs font-bold text-white">Off route — finding a new way…</p>
            </div>
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

      {navigating ? (
        <section className="relative z-10 shrink-0 rounded-t-[28px] bg-white px-4 pb-5 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
          <div className="mx-auto flex w-full max-w-[440px] items-center justify-between gap-3">
            <button
              type="button"
              onClick={exitNavigation}
              aria-label="Exit navigation"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition-transform active:scale-95"
            >
              <X className="h-5 w-5" strokeWidth={2.4} />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-xl font-black leading-none text-emerald-600">{navRoute?.durationText || '--'}</p>
              <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
                {navRoute?.distanceText || '--'}{arrivalTime ? ` • ${arrivalTime}` : ''}
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E51E2B]/10 text-[#E51E2B]">
              {(() => {
                const ModeIcon = travelModes.find((m) => m.key === activeMode)?.icon || Car;
                return <ModeIcon className="h-5 w-5" />;
              })()}
            </span>
          </div>
        </section>
      ) : (
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

            {(locationNeeded || routeError) && (
              <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold leading-snug text-amber-900">{routeError || 'Location is needed for turn-by-turn directions.'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleGetDirections()}
                      className="rounded-full bg-amber-600 px-3 py-1.5 text-[10px] font-bold text-white"
                    >
                      Try again
                    </button>
                    <a
                      href={googleDirectionsUrl(activeMode, storePos)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-[10px] font-bold text-amber-800"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              </div>
            )}

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
      )}
    </div>
  );
}
