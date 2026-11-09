import { unstable_rethrow } from "next/navigation";
import NavigationLinks from "@/features/navigation/components/PrimaryNavigation/NavigationLinks";
import { getServerQueryClient } from "@/lib/react-query/server";
import {
  isPostseason,
  isPostseasonForcedByEnv,
} from "@/features/navigation/utils/postseason";
import { currentNbaDate } from "@/utils/nba-date";
import { scoreboardServerQuery } from "@/api/server";

export default async function PrimaryNavigation() {
  return <NavigationLinks showPlayoffs={await shouldShowPlayoffs()} />;
}

export function PrimaryNavigationFallback() {
  return <NavigationLinks showPlayoffs={false} />;
}

async function shouldShowPlayoffs() {
  const forcedOn = isPostseasonForcedByEnv();

  try {
    // Shares the request-scoped client so the home page prefetch and this lookup make a single ESPN request.
    const { games } = await getServerQueryClient().fetchQuery(
      scoreboardServerQuery(currentNbaDate()),
    );
    return isPostseason(games, forcedOn);
  } catch (error) {
    // Lets Next.js see the live scoreboard's request-time fetch, so a prerendered page such as the 404 renders on demand instead.
    unstable_rethrow(error);
    // The tab is a convenience, so a scoreboard failure hides it instead of breaking every page.
    console.error("Failed to load the scoreboard for the playoffs tab", error);
    return forcedOn;
  }
}
