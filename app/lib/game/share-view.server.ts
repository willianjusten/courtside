import "server-only";
import { unstable_rethrow } from "next/navigation";
import { isGameId } from "@/app/lib/game/game-id";
import { shareViewOf, type ShareView } from "@/app/lib/game/share-view";
import { gameSummaryQueryOptions } from "@/app/lib/queries/game-summary";
import { getServerQueryClient } from "@/app/lib/query/server";

// Shared by the page metadata and the Open Graph image, so both preview the same game state.
export async function loadShareView(gameId: string): Promise<ShareView> {
  if (!isGameId(gameId)) return shareViewOf(null);
  try {
    return shareViewOf(
      await getServerQueryClient().fetchQuery(gameSummaryQueryOptions(gameId)),
    );
  } catch (error) {
    // Next signals dynamic rendering by throwing, which must not be mistaken for a failed fetch.
    unstable_rethrow(error);
    // A failed fetch keeps the default preview rather than a broken one.
    return shareViewOf(null);
  }
}
