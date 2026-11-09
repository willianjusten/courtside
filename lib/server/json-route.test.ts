// @vitest-environment node
import { EspnRequestError } from "@/lib/espn";
import { cachedJsonResponse } from "./json-route";

describe("cachedJsonResponse", () => {
  it("caches the data on the CDN only", async () => {
    const response = await cachedJsonResponse(
      async () => ({ ok: 1 }),
      300,
      "data",
    );

    expect(await response.json()).toEqual({ ok: 1 });
    expect(response.headers.get("cdn-cache-control")).toBe(
      "public, max-age=300, stale-while-revalidate=300",
    );
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, must-revalidate",
    );
  });

  it("answers not found, uncached, for a resource ESPN does not know", async () => {
    const response = await cachedJsonResponse(
      async () => {
        throw new EspnRequestError("https://espn", 404, "");
      },
      300,
      "data",
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers bad gateway, uncached, when ESPN fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await cachedJsonResponse(
      async () => {
        throw new EspnRequestError("https://espn", 503, "");
      },
      300,
      "data",
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
