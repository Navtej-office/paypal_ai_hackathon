// Checks an HTTP Basic auth header against the app password. Any username is accepted.
export function isAuthorized(authHeader: string | null, password: string): boolean {
  if (!authHeader?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(authHeader.slice("Basic ".length));
    const colon = decoded.indexOf(":");
    if (colon === -1) return false;
    return decoded.slice(colon + 1) === password;
  } catch {
    return false;
  }
}