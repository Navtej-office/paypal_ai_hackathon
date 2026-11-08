import { describe, it, expect, vi } from "vitest";
import { createTokenProvider, PayPalConfig } from "./token";


const config: PayPalConfig = {
  baseUrl: "https://api-m.sandbox.paypal.com",
  clientId: "test-id",
  clientSecret: "test-secret",
};

const tokenResponse = (token: string, expiresIn = 32400) =>
  new Response(JSON.stringify({ access_token: token, expires_in: expiresIn }), { status: 200 });

describe("createTokenProvider", () => {
  it("requests a token from PayPal's OAuth endpoint", async () => {
    const fetchFn = vi.fn().mockResolvedValue(tokenResponse("abc"));
    const getToken = createTokenProvider(config, fetchFn);

    expect(await getToken()).toBe("abc");

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
    expect(init.method).toBe("POST");
    expect(init.body).toBe("grant_type=client_credentials");
  });

  it("sends the client ID and secret as Basic auth", async () => {
    const fetchFn = vi.fn().mockResolvedValue(tokenResponse("abc"));
    await createTokenProvider(config, fetchFn)();

    const expected = "Basic " + Buffer.from("test-id:test-secret").toString("base64");
    expect(fetchFn.mock.calls[0][1].headers.Authorization).toBe(expected);
  });

  it("reuses the token instead of asking again", async () => {
    const fetchFn = vi.fn().mockResolvedValue(tokenResponse("abc"));
    const getToken = createTokenProvider(config, fetchFn);

    await getToken();
    await getToken();

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("gets a new token when the old one is about to expire", async () => {
    let clock = 0;
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse("first", 3600))
      .mockResolvedValueOnce(tokenResponse("second", 3600));
    const getToken = createTokenProvider(config, fetchFn, () => clock);

    expect(await getToken()).toBe("first");
    clock = 3550 * 1000; // 50 seconds before expiry
    expect(await getToken()).toBe("second");
  });

  it("throws a clear error when PayPal rejects the credentials", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('{"error":"invalid_client"}', { status: 401 }));
    await expect(createTokenProvider(config, fetchFn)()).rejects.toThrow("PayPal token request failed: 401");
  });
});