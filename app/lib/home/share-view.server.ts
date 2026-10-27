import "server-only";
import { unstable_rethrow } from "next/navigation";
import { homeShareViewOf, type HomeShareView } from "@/app/lib/home/share-view";
import { scoreboardQueryOptions } from "@/app/lib/queries/scoreboard";
import { getServerQueryClient } from "@/app/lib/query/server";
import { currentNbaDate } from "@/app/lib/time/nba-date";

export async function loadHomeShareView(): Promise<HomeShareView> {
  try {
    return homeShareViewOf(
      await getServerQueryClient().fetchQuery(
        scoreboardQueryOptions(currentNbaDate()),
      ),
    );
  } catch (error) {
    // Next signals dynamic rendering by throwing, which must not be mistaken for a failed fetch.
    unstable_rethrow(error);
    // A failed fetch keeps the default preview rather than a broken one.
    return homeShareViewOf(null);
  }
}
