import { describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, retryDynamicImport } from '../src/lib/lazyWithRetry';

describe('lazyWithRetry helpers', () => {
  it('identifies dynamic module and chunk load errors', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /src/components/Onboarding.tsx'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true);
    expect(isChunkLoadError(new Error('ChunkLoadError: Loading chunk 12 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('Regular runtime bug'))).toBe(false);
  });

  it('retries transient dynamic import failures and resolves when subsequent attempt succeeds', async () => {
    const importer = vi
      .fn<() => Promise<{ ok: boolean }>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module: /src/components/Foo.tsx'))
      .mockResolvedValueOnce({ ok: true });

    const result = await retryDynamicImport(importer, 2, 1);
    expect(result).toEqual({ ok: true });
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-chunk errors', async () => {
    const importer = vi
      .fn<() => Promise<{ ok: boolean }>>()
      .mockRejectedValueOnce(new Error('Syntax error inside module'));

    await expect(retryDynamicImport(importer, 2, 1)).rejects.toThrow('Syntax error inside module');
    expect(importer).toHaveBeenCalledTimes(1);
  });
});
