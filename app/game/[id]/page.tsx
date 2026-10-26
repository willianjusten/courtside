import { notFound } from "next/navigation";
import GameDetail from "@/app/components/GameDetail";
import { EspnRequestError } from "@/app/lib/espn";
import { gameSummaryQueryOptions } from "@/app/lib/queries/game-summary";
import { getServerQueryClient, Hydrate } from "@/app/lib/query/server";

// The navigation reads today's live scoreboard to decide on the Playoffs tab, so the page renders on every request.
export const dynamic = "force-dynamic";

// ESPN event ids are numeric.
const GAME_ID_PATTERN = /^\d+$/;
// ESPN answers 404 for an unknown event and 400 for an id it cannot read.
const UNKNOWN_GAME_STATUSES = new Set([400, 404]);

type GamePageProps = {
  params: Promise<{ id: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { id } = await params;
  if (!GAME_ID_PATTERN.test(id)) notFound();

  try {
    await getServerQueryClient().fetchQuery(gameSummaryQueryOptions(id));
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
