import * as maplibreNamespace from 'maplibre-gl/dist/maplibre-gl.mjs';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

if (typeof window !== 'undefined' && typeof maplibreNamespace.setWorkerUrl === 'function') {
  maplibreNamespace.setWorkerUrl(maplibreWorkerUrl);
}

export * from 'maplibre-gl/dist/maplibre-gl.mjs';
export default maplibreNamespace;
