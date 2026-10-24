import PagePlaceholder from "@/app/components/PagePlaceholder";
import { Hydrate } from "@/app/lib/query/server";
import { strings } from "@/app/lib/strings";

// The navigation reads today's live scoreboard to decide on the Playoffs tab, so the page renders on every request.
export const dynamic = "force-dynamic";

export default function PlayoffsPage() {
  return (
    <Hydrate>
      <PagePlaceholder title={strings.playoffs.title} />
    </Hydrate>
  );
}
