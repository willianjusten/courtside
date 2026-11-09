import "server-only";

type CacheEntry = {
  value?: unknown;
  hasValue: boolean;
  expiresAt: number;
  pendingLoad?: Promise<unknown>;
};

// Bounds memory when crawlers walk many dates or game ids; the oldest entry is evicted first.
const MAX_ENTRIES = 200;
const entries = new Map<string, CacheEntry>();

function startLoad<Value>(
  key: string,
  entry: CacheEntry,
  ttlSeconds: number,
  load: () => Promise<Value>,
): Promise<Value> {
  const pendingLoad = load()
    .then((value) => {
      entries.delete(key);
      entries.set(key, {
        value,
        hasValue: true,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      while (entries.size > MAX_ENTRIES) {
        entries.delete(entries.keys().next().value!);
      }
      return value;
    })
    .finally(() => {
      if (entry.pendingLoad === pendingLoad) entry.pendingLoad = undefined;
    });
  entry.pendingLoad = pendingLoad;
  return pendingLoad;
}

/**
 * Per-instance cache with stale-while-revalidate. Fluid Compute reuses instances across requests,
 * so this spares ESPN round trips without writing to Vercel's Data Cache, which bills as ISR writes.
 * A stale value is served while one background load refreshes it; a failed refresh keeps the stale value.
 */
export function memoryCached<Value>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<Value>,
): Promise<Value> {
  let entry = entries.get(key);
  if (!entry) {
    entry = { hasValue: false, expiresAt: 0 };
    entries.set(key, entry);
  }

  if (!entry.hasValue) {
    return (entry.pendingLoad ??
      startLoad(key, entry, ttlSeconds, load)) as Promise<Value>;
  }

  if (Date.now() >= entry.expiresAt && !entry.pendingLoad) {
    startLoad(key, entry, ttlSeconds, load).catch((error: unknown) => {
      console.error(`Failed to refresh the cached ${key}`, error);
    });
  }
  return Promise.resolve(entry.value as Value);
}

export function clearMemoryCache() {
  entries.clear();
}
