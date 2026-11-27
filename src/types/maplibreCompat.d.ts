declare module 'maplibre-gl/dist/maplibre-gl.mjs' {
  export * from 'maplibre-gl';
}

declare module 'maplibre-gl/dist/maplibre-gl-worker.mjs?url' {
  const workerUrl: string;
  export default workerUrl;
}
