import { Suspense } from "react";
import DayScoreboard from "@/features/scoreboard/components/DayScoreboard";
import HomeSidebar from "@/features/scoreboard/components/HomeSidebar";
import { HomeSidebarLoading } from "@/features/scoreboard/components/HomeSidebar/states";
import { prefetchDayScoreboard } from "@/features/scoreboard/api/prefetch-day";
import { Hydrate } from "@/lib/react-query/server";
import { currentNbaDate } from "@/utils/nba-date";

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
