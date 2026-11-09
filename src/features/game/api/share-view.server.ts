import "server-only";
import { unstable_rethrow } from "next/navigation";
import { isGameId } from "@/features/game/utils/game-id";
import { shareViewOf, type ShareView } from "@/features/game/utils/share-view";
import { getServerQueryClient } from "@/lib/react-query/server";
import { gameSummaryServerQuery } from "@/features/game/api/server";

// Shared by the page metadata and the Open Graph image, so both preview the same game state.
export async function loadShareView(gameId: string): Promise<ShareView> {
  if (!isGameId(gameId)) return shareViewOf(null);
  try {
    return shareViewOf(
      await getServerQueryClient().fetchQuery(gameSummaryServerQuery(gameId)),
    );
  } catch (error) {
    // Next signals dynamic rendering by throwing, which must not be mistaken for a failed fetch.
    unstable_rethrow(error);
    // A failed fetch keeps the default preview rather than a broken one.
    return shareViewOf(null);
  }
}
