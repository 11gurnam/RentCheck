import { describe, it, expect } from "vitest";
import { recentAuthentication } from "./recent-auth";
describe("recent verified authentication", () => {
  it("requires a recent sign-in method, rather than a freshly issued refresh token", () => {
    expect(
      recentAuthentication(
        { iat: 1000, amr: [{ method: "password", timestamp: 999 }] },
        1000,
      ),
    ).toBe(true);
    expect(
      recentAuthentication(
        { iat: 1000, amr: [{ method: "password", timestamp: 399 }] },
        1000,
      ),
    ).toBe(false);
    expect(
      recentAuthentication(
        { iat: 1000, amr: [{ method: "token_refresh", timestamp: 999 }] },
        1000,
      ),
    ).toBe(false);
    expect(
      recentAuthentication(
        { amr: [{ method: "oauth", timestamp: 999 }] },
        1000,
      ),
    ).toBe(true);
    expect(
      recentAuthentication(
        { amr: [{ method: "recovery", timestamp: 999 }] },
        1000,
      ),
    ).toBe(true);
    expect(
      recentAuthentication(
        { amr: [{ method: "password", timestamp: 2000 }] },
        1000,
      ),
    ).toBe(false);
    for (const value of [
      null,
      {},
      { amr: "password" },
      { amr: [{}] },
      { amr: [{ method: "password", timestamp: "999" }] },
    ])
      expect(recentAuthentication(value, 1000)).toBe(false);
  });
});
