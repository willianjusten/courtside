# 0001: No ISR; cache ESPN data in server memory and on the CDN

Status: accepted (2026-11-09)

## Context

On Vercel, every write to the ISR cache, including Next.js' Data Cache (`fetch` with `next.revalidate`), bills as an ISR write in 8 KB units. The free tier allows 200,000 writes a month, and this app alone used 75% of them. The main writers were:

- the scoreboard header behind the date rail: about 2 MB per 15-day range, revalidated hourly, with one entry per range a visitor or crawler opened (about 250 units per write);
- team schedules: about 900 KB, revalidated every 5 minutes;
- team pages: ISR with an effective 5-minute revalidate (inherited from the schedule fetch), about 330 KB of HTML and RSC per regeneration, for 30 teams, plus a 404 entry for every unknown slug.

## Decision

- ESPN is always fetched with `cache: "no-store"` (`lib/espn/transport.ts`). Nothing writes to the Data Cache.
- The server keeps mapped results in a per-instance memory cache with stale-while-revalidate (`lib/server/memory-cache.ts`, TTLs in `lib/server/loaders.ts`). Fluid Compute reuses instances, so most renders skip ESPN.
- The browser reads non-live data from `/api/*` route handlers that return mapped JSON with `CDN-Cache-Control` (`lib/server/json-route.ts`). CDN cache reads and writes are free.
- Live data (scoreboard, game summary) and the small season calendar are fetched by the browser straight from ESPN, so polling never reaches Vercel.
- Every page renders on demand (`dynamic = "force-dynamic"` in `app/layout.tsx`). No page is ISR.

## Consequences

- ISR writes drop to the static build output only.
- Each page view is a function invocation, so it uses invocations and active CPU, which are cheap on Fluid Compute. A cold instance pays one round of ESPN requests.
- Browser payloads shrink: game counts go from 2 MB to about 0.2 KB, a team schedule from 900 KB to 66 KB, standings from 165 KB to 13 KB, and the teams list from 135 KB to 7 KB.
- Reintroducing `next.revalidate`, `export const revalidate`, `"use cache"`, or `unstable_cache` brings the ISR bill back. Cache in memory or on the CDN instead.
