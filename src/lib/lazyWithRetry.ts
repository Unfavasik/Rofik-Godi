import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk [\d]+ failed/i,
  /ChunkLoadError/i,
  /error loading dynamically imported module/i,
];

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === 'string'
        ? error
        : '';
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export async function retryDynamicImport<T>(
  importer: () => Promise<T>,
  retries = 2,
  delayMs = 300,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await importer();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isChunkLoadError(error)) {
        throw error;
      }
      await new Promise<void>((resolve) => {
        setTimeout(resolve, delayMs * (attempt + 1));
      });
    }
  }
  throw lastError;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  retries = 2,
): LazyExoticComponent<T> {
  return lazy(() => retryDynamicImport(importer, retries));
}
