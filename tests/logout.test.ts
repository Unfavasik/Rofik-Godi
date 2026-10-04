import { describe, expect, it, vi } from 'vitest';
import { signOutCurrentDevice } from '../src/lib/authLogout';

describe('sign out current device', () => {
  it('requests local scope so other signed-in devices stay untouched', async () => {
    const signOut = vi.fn(async (options: { scope: 'local' }) => ({
      error: options.scope === 'local' ? null : new Error('wrong scope'),
    }));

    await expect(signOutCurrentDevice(signOut)).resolves.toBe(true);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('reports a returned auth error without throwing', async () => {
    const signOut = vi.fn(async (options: { scope: 'local' }) => ({
      error: options.scope === 'local' ? new Error('local sign out failed') : null,
    }));

    await expect(signOutCurrentDevice(signOut)).resolves.toBe(false);
  });

  it('reports a rejected auth call without blocking local app cleanup', async () => {
    const signOut = vi.fn(async (options: { scope: 'local' }) => {
      throw new Error(`offline during ${options.scope} sign out`);
    });

    await expect(signOutCurrentDevice(signOut)).resolves.toBe(false);
  });

  it('allows the app to reset its local state when Supabase is not configured', async () => {
    await expect(signOutCurrentDevice(null)).resolves.toBe(true);
  });
});
