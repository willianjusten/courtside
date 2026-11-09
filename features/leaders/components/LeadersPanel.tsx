import type { LeaderCategory, TeamLeaderCategory } from "@/lib/domain/leaders";
import { resizedImageUrl } from "@/lib/espn";
import {
  buildSidebarLeaders,
  type SidebarLeaderCategory,
} from "@/features/scoreboard/sidebar";
import { strings } from "@/lib/strings";
import {
  PANEL_HEADING_CLASS_NAME,
  PANEL_SURFACE_CLASS_NAME,
} from "@/components/panel-styles";

// ESPN headshots are 1040x760, so this keeps their aspect ratio.
const HEADSHOT_DISPLAY_WIDTH = 56;
const HEADSHOT_DISPLAY_HEIGHT = 41;
// Requested at twice the display size so headshots stay sharp on high-density screens.
const HEADSHOT_REQUEST_SCALE = 2;
const DEFAULT_HEADING_ID = "sidebar-leaders";

const HEADSHOT_CLASS_NAME = "shrink-0 rounded-[10px] bg-white/6 object-cover";

function CategoryMessage({ category }: { category: SidebarLeaderCategory }) {
  return category.status === "error" ? (
    <p role="alert" className="text-sm text-muted">
      {strings.leaders.categoryError}
    </p>
  ) : (
    <p className="text-sm text-muted">{strings.leaders.empty}</p>
  );
}

function LeaderRow({
  category,
  panelHeadingId,
}: {
  category: SidebarLeaderCategory;
  panelHeadingId: string;
}) {
  const title = strings.home.sidebar.categories[category.stat];
  const headingId = `${panelHeadingId}-${category.stat}`;

  return (
    <section
      aria-labelledby={headingId}
      className="flex items-center gap-3 border-t border-white/7 pt-3"
    >
      {category.status === "ready" && category.leader.athlete.headshotUrl ? (
        <img
          src={resizedImageUrl(
            category.leader.athlete.headshotUrl,
            HEADSHOT_DISPLAY_WIDTH * HEADSHOT_REQUEST_SCALE,
            HEADSHOT_DISPLAY_HEIGHT * HEADSHOT_REQUEST_SCALE,
          )}
          alt={category.leader.athlete.displayName}
          width={HEADSHOT_DISPLAY_WIDTH}
          height={HEADSHOT_DISPLAY_HEIGHT}
          loading="lazy"
          className={HEADSHOT_CLASS_NAME}
        />
      ) : (
        <span
          aria-hidden="true"
          className={HEADSHOT_CLASS_NAME}
          style={{
            width: HEADSHOT_DISPLAY_WIDTH,
            height: HEADSHOT_DISPLAY_HEIGHT,
          }}
        />
      )}
      <div className="flex min-w-0 grow flex-col gap-0.5">
        <h3
          id={headingId}
          className="text-[10px] tracking-[0.16em] text-muted uppercase"
        >
          {title}
        </h3>
        {category.status === "ready" ? (
          <>
            <span className="text-sm font-bold">
              {category.leader.athlete.displayName}
            </span>
            {category.runnersUp.length > 0 && (
              <ol className="flex flex-wrap gap-x-1 text-[11px] text-muted">
                {category.runnersUp.map((runnerUp, index) => (
                  <li key={runnerUp.rank}>
                    {index > 0 && <span aria-hidden="true">· </span>}
                    {strings.home.sidebar.runnerUp(runnerUp)}
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : (
          <CategoryMessage category={category} />
        )}
      </div>
      {category.status === "ready" && (
        <span className="font-display text-[28px] leading-none text-accent-soft">
          {category.leader.displayValue}
        </span>
      )}
    </section>
  );
}

type LeadersPanelProps = {
  // null when the leaders could not be loaded.
  categories: (LeaderCategory | TeamLeaderCategory)[] | null;
  // The home sidebar's league leaders by default; the team page names its own.
  title?: string;
  headingId?: string;
};

export default function LeadersPanel({
  categories,
  title = strings.home.sidebar.leadersTitle,
  headingId = DEFAULT_HEADING_ID,
}: LeadersPanelProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={`flex flex-col gap-3.5 ${PANEL_SURFACE_CLASS_NAME}`}
    >
      <h2 id={headingId} className={PANEL_HEADING_CLASS_NAME}>
        {title}
      </h2>
      {categories ? (
        buildSidebarLeaders(categories).map((category) => (
          <LeaderRow
            key={category.stat}
            category={category}
            panelHeadingId={headingId}
          />
        ))
      ) : (
        <p role="alert" className="text-sm text-secondary">
          {strings.leaders.error}
        </p>
      )}
    </section>
  );
}
