import "server-only";
import { unstable_rethrow } from "next/navigation";
import { getServerQueryClient } from "@/lib/react-query/server";
import {
  standingsShareViewOf,
  type StandingsShareView,
} from "@/features/standings/utils/share-view";
import { standingsServerQuery } from "@/api/server";

export async function loadStandingsShareView(): Promise<StandingsShareView> {
  try {
    return standingsShareViewOf(
      await getServerQueryClient().fetchQuery(standingsServerQuery()),
    );
  } catch (error) {
    // Next signals dynamic rendering by throwing, which must not be mistaken for a failed fetch.
    unstable_rethrow(error);
    return standingsShareViewOf(null);
  }
}
