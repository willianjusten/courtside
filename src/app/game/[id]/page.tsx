import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GameDetail from "@/features/game/components/GameDetail";
import { EspnRequestError } from "@/lib/espn/transport";
import { isGameId } from "@/features/game/utils/game-id";
import { loadShareView } from "@/features/game/api/share-view.server";
import { getServerQueryClient, Hydrate } from "@/lib/react-query/server";
import { gameSummaryServerQuery } from "@/features/game/api/server";

// ESPN answers 404 for an unknown event and 400 for an id it cannot read.
const UNKNOWN_GAME_STATUSES = new Set([400, 404]);

type GamePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { id } = await params;
  const shareView = await loadShareView(id);
  if (shareView.variant === "fallback") return {};

  const { title, description } = shareView;
  return {
    title,
    description,
    // A page-level openGraph replaces the layout one entirely, so url and type are repeated here.
    openGraph: { type: "website", url: "./", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { id } = await params;
  if (!isGameId(id)) notFound();

  try {
    await getServerQueryClient().fetchQuery(gameSummaryServerQuery(id));
  } catch (error) {
    if (
      error instanceof EspnRequestError &&
      UNKNOWN_GAME_STATUSES.has(error.status)
    ) {
      notFound();
    }
    // Any other failure is left to the client, which shows the error state with a retry.
  }

  return (
    <Hydrate>
      <section className="py-8">
        <GameDetail gameId={id} />
      </section>
    </Hydrate>
  );
}
