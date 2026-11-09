import { notFound } from "next/navigation";
import { Suspense } from "react";
import DayScoreboard from "@/features/scoreboard/components/DayScoreboard";
import HomeSidebar from "@/features/scoreboard/components/HomeSidebar";
import { HomeSidebarLoading } from "@/features/scoreboard/components/HomeSidebar/states";
import { prefetchDayScoreboard } from "@/features/scoreboard/api/prefetch-day";
import { Hydrate } from "@/lib/react-query/server";
import { currentNbaDate, parseNbaDate } from "@/utils/nba-date";

type GamesPageProps = {
  params: Promise<{ date: string }>;
};

export default async function GamesPage({ params }: GamesPageProps) {
  const nbaDate = parseNbaDate((await params).date);
  if (!nbaDate) notFound();

  await prefetchDayScoreboard(nbaDate);

  return (
    <Hydrate>
      <DayScoreboard
        initialDate={nbaDate}
        today={currentNbaDate()}
        sidebar={
          <Suspense fallback={<HomeSidebarLoading />}>
            <HomeSidebar />
          </Suspense>
        }
      />
    </Hydrate>
  );
}
