import { Suspense } from "react";
import DayScoreboard from "@/features/scoreboard/components/DayScoreboard";
import HomeSidebar from "@/features/scoreboard/components/HomeSidebar";
import { HomeSidebarLoading } from "@/features/scoreboard/components/HomeSidebar/states";
import { prefetchDayScoreboard } from "@/features/scoreboard/queries/prefetch-day";
import { Hydrate } from "@/lib/query/server";
import { currentNbaDate } from "@/lib/time/nba-date";

// The current NBA date depends on request time, so the page cannot be prerendered at build time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const nbaDate = currentNbaDate();
  await prefetchDayScoreboard(nbaDate);

  return (
    <Hydrate>
      <DayScoreboard
        initialDate={nbaDate}
        today={nbaDate}
        sidebar={
          <Suspense fallback={<HomeSidebarLoading />}>
            <HomeSidebar />
          </Suspense>
        }
      />
    </Hydrate>
  );
}
