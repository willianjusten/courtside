import { loadLeaders, loadStandings } from "@/lib/server/loaders";
import { strings } from "@/config/strings";
import LeadersPanel from "@/components/LeadersPanel/index";
import StandingsPanel from "./StandingsPanel";

// The sidebar is secondary, so each half fails on its own instead of taking the page down.
function logFailureAsNull(description: string) {
  return (error: unknown) => {
    console.error(`Failed to load ${description}`, error);
    return null;
  };
}

// Desktop only. Render it inside Suspense so it streams after the game list instead of holding it back.
export default async function HomeSidebar() {
  const [standings, leaderCategories] = await Promise.all([
    loadStandings().catch(logFailureAsNull("the sidebar standings")),
    loadLeaders().catch(logFailureAsNull("the sidebar league leaders")),
  ]);

  return (
    <aside
      aria-label={strings.home.sidebar.label}
      className="hidden flex-col gap-4 lg:flex"
    >
      <StandingsPanel conferences={standings?.conferences ?? null} />
      <LeadersPanel categories={leaderCategories} />
    </aside>
  );
}
