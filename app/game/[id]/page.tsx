import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GameDetail from "@/features/game/components/GameDetail";
import { EspnRequestError } from "@/lib/espn";
import { isGameId } from "@/features/game/game-id";
import { loadShareView } from "@/features/game/share-view.server";
import { getServerQueryClient, Hydrate } from "@/lib/query/server";
import { gameSummaryServerQuery } from "@/features/game/queries/server";

// The navigation reads today's live scoreboard to decide on the Playoffs tab, so the page renders on every request.
export const dynamic = "force-dynamic";

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
