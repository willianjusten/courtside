import type { LeaderCategory, TeamLeaderCategory } from "@/types/leaders";
import { resizedHeadshotUrl } from "@/lib/espn/logos";
import {
  buildLeadersPanelCategories,
  type LeadersPanelCategory,
} from "./leaders-panel-view";
import { strings } from "@/config/strings";
import {
  PANEL_HEADING_CLASS_NAME,
  PANEL_SURFACE_CLASS_NAME,
} from "@/components/ui/panel-styles";

const HEADSHOT_DISPLAY_WIDTH = 56;
const HEADSHOT_DISPLAY_HEIGHT = 41;
const DEFAULT_HEADING_ID = "sidebar-leaders";

const HEADSHOT_CLASS_NAME = "shrink-0 rounded-[10px] bg-white/6 object-cover";

function CategoryMessage({ category }: { category: LeadersPanelCategory }) {
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
  category: LeadersPanelCategory;
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
          src={resizedHeadshotUrl(
            category.leader.athlete.headshotUrl,
            HEADSHOT_DISPLAY_WIDTH,
            HEADSHOT_DISPLAY_HEIGHT,
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
        buildLeadersPanelCategories(categories).map((category) => (
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
