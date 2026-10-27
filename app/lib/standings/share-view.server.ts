import "server-only";
import { unstable_rethrow } from "next/navigation";
import { standingsQueryOptions } from "@/app/lib/queries/standings";
import { getServerQueryClient } from "@/app/lib/query/server";
import {
  standingsShareViewOf,
  type StandingsShareView,
} from "@/app/lib/standings/share-view";

export async function loadStandingsShareView(): Promise<StandingsShareView> {
  try {
    return standingsShareViewOf(
      await getServerQueryClient().fetchQuery(standingsQueryOptions()),
    );
  } catch (error) {
    // Next signals dynamic rendering by throwing, which must not be mistaken for a failed fetch.
    unstable_rethrow(error);
    // A failed fetch keeps the default preview rather than a broken one.
    return standingsShareViewOf(null);
  }
}
