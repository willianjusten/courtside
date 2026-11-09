// @vitest-environment node
import { memoryCached } from "./memory-cache";

const TTL_SECONDS = 60;

afterEach(() => {
  vi.useRealTimers();
});

describe("memoryCached", () => {
  it("loads once while the value is fresh", async () => {
    const load = vi.fn(async () => "teams");

    expect(await memoryCached("fresh", TTL_SECONDS, load)).toBe("teams");
    expect(await memoryCached("fresh", TTL_SECONDS, load)).toBe("teams");
    expect(load).toHaveBeenCalledOnce();
  });

  it("shares one load between concurrent callers", async () => {
    const load = vi.fn(async () => "teams");

    await Promise.all([
      memoryCached("concurrent", TTL_SECONDS, load),
      memoryCached("concurrent", TTL_SECONDS, load),
    ]);

    expect(load).toHaveBeenCalledOnce();
  });

  it("serves the stale value while it refreshes in the background", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await memoryCached("stale", TTL_SECONDS, async () => "old");
    vi.advanceTimersByTime(TTL_SECONDS * 1000);
    const refresh = vi.fn(async () => "new");

    expect(await memoryCached("stale", TTL_SECONDS, refresh)).toBe("old");
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(await memoryCached("stale", TTL_SECONDS, refresh)).toBe("new");
  });

  it("keeps the stale value when a refresh fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ["Date"] });
    await memoryCached("failed-refresh", TTL_SECONDS, async () => "old");
    vi.advanceTimersByTime(TTL_SECONDS * 1000);
    const failingRefresh = vi.fn(async () => {
      throw new Error("ESPN is down");
    });

    await memoryCached("failed-refresh", TTL_SECONDS, failingRefresh);
    await vi.waitFor(() => expect(console.error).toHaveBeenCalled());

    expect(
      await memoryCached("failed-refresh", TTL_SECONDS, async () => "unused"),
    ).toBe("old");
  });

  it("does not cache a failed first load", async () => {
    await expect(
      memoryCached("failed", TTL_SECONDS, async () => {
        throw new Error("ESPN is down");
      }),
    ).rejects.toThrow("ESPN is down");

    expect(await memoryCached("failed", TTL_SECONDS, async () => "ok")).toBe(
      "ok",
    );
  });
});
