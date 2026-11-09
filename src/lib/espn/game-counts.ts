import type { GameCounts } from "@/types/game";
import type { NbaDate } from "@/types/nba-date";
import { addDaysToNbaDate, nbaDateOf } from "@/utils/nba-date";
import type { RawScoreboardHeader } from "./raw-types";
import { espnGet } from "./transport";

const toEspnDate = (nbaDate: NbaDate) => nbaDate.replaceAll("-", "");

export async function fetchGameCounts(
  firstDate: NbaDate,
  lastDate: NbaDate,
): Promise<GameCounts> {
  const rawHeader = await espnGet<RawScoreboardHeader>("scoreboardHeader", {
    searchParams: new URLSearchParams({
      sport: "basketball",
      league: "nba",
      dates: `${toEspnDate(firstDate)}-${toEspnDate(lastDate)}`,
      // Without a limit ESPN truncates the range to about 75 events, dropping the later days of a 15-day rail.
      limit: "1000",
    }),
  });

  // Without the league, ESPN sent something unexpected, which must not read as a week without games.
  const league = rawHeader.sports?.[0]?.leagues?.[0];
  if (!league) {
    throw new Error(
      `ESPN scoreboard header for ${firstDate}–${lastDate} has no league`,
    );
  }

  const gameCounts: GameCounts = {};
  // NbaDate strings are YYYY-MM-DD, so string order is calendar order.
  for (
    let nbaDate = firstDate;
    nbaDate <= lastDate;
    nbaDate = addDaysToNbaDate(nbaDate, 1)
  ) {
    gameCounts[nbaDate] = 0;
  }
  for (const event of league.events ?? []) {
    const gameDate = nbaDateOf(event.date);
    const dayCount = gameCounts[gameDate];
    if (dayCount !== undefined) gameCounts[gameDate] = dayCount + 1;
  }
  return gameCounts;
}
