type LocalSignOut = (options: { scope: 'local' }) => Promise<{ error: unknown | null }>;

/** Signs out this browser session only; never revokes the user's other devices. */
export async function signOutCurrentDevice(signOut: LocalSignOut | null): Promise<boolean> {
  if (!signOut) return true;

  try {
    const { error } = await signOut({ scope: 'local' });
    return error === null;
  } catch {
    return false;
  }
}
