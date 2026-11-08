export type PayPalConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
};

export type FetchFn = typeof fetch;

const REFRESH_MARGIN_MS = 60 * 1000; // refresh a minute before expiry

export function createTokenProvider(
  config: PayPalConfig,
  fetchFn: FetchFn = fetch,
  now: () => number = Date.now,
) {
  let cached: { token: string; expiresAt: number } | null = null;

  return async function getToken(): Promise<string> {
    if (cached && now() < cached.expiresAt - REFRESH_MARGIN_MS) return cached.token;

    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    const res = await fetchFn(`${config.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) throw new Error(`PayPal token request failed: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as { access_token: string; expires_in: number };
    cached = { token: data.access_token, expiresAt: now() + data.expires_in * 1000 };
    return cached.token;
  };
}