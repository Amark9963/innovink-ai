import { describe, expect, it } from "vitest";
import { resolveRedirectOrigin } from "@/lib/auth/redirect-origin";

describe("resolveRedirectOrigin", () => {
  it("prefers forwarded proxy headers for public production redirects", () => {
    expect(
      resolveRedirectOrigin({
        requestUrl: "http://0.0.0.0:3000/auth/callback?code=test",
        forwardedHost: "innovink.solvintell.com",
        forwardedProto: "https",
      }),
    ).toBe("https://innovink.solvintell.com");
  });

  it("keeps localhost origins during local development", () => {
    expect(
      resolveRedirectOrigin({
        requestUrl: "http://localhost:3000/auth/callback?code=test",
        host: "localhost:3000",
      }),
    ).toBe("http://localhost:3000");
  });
});
