import "server-only";
import { unstable_rethrow } from "next/navigation";
import { getServerQueryClient } from "@/lib/query/server";
import {
  standingsShareViewOf,
  type StandingsShareView,
} from "@/features/standings/share-view";
import { standingsServerQuery } from "@/features/standings/queries/server";

export async function loadStandingsShareView(): Promise<StandingsShareView> {
  try {
    return standingsShareViewOf(
      await getServerQueryClient().fetchQuery(standingsServerQuery()),
    );
  } catch (error) {
    // Next signals dynamic rendering by throwing, which must not be mistaken for a failed fetch.
    unstable_rethrow(error);
    // A failed fetch keeps the default preview rather than a broken one.
    return standingsShareViewOf(null);
  }
}
