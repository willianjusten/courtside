import { render, screen } from "@testing-library/react";
import type {
  TeamLiveGame,
  TeamOpponent,
  TeamResult,
  TeamSchedule as TeamScheduleView,
  TeamUpcomingGame,
} from "@/features/teams/utils/team-view";
import TeamSchedule from "@/features/teams/components/TeamSchedule";

function opponentNamed(name: string): TeamOpponent {
  return {
    name,
    displayName: `City ${name}`,
    logoUrl: `https://a.espncdn.com/i/teamlogos/nba/500/${name.toLowerCase()}.png`,
  };
}

function scheduleGame(id: string, opponentName: string) {
  return {
    id,
    startTime: "2026-10-30T23:00Z",
    weekdayLabel: "Fri",
    dateLabel: "Oct 30",
    isHome: true,
    sideLabel: "vs",
    opponent: opponentNamed(opponentName),
    href: `/games/${id}`,
  };
}

const liveGame: TeamLiveGame = {
  ...scheduleGame("live", "Celtics"),
  statusLabel: "Q3 4:21",
  channelLabel: "ESPN",
  metaLabel: "Q3 4:21 · ESPN",
  score: "88-64",
};

const upcomingGame: TeamUpcomingGame = {
  ...scheduleGame("upcoming", "Knicks"),
  timeLabel: "7:00 PM",
  channelLabel: "NBA League Pass",
  isPostponed: false,
  isNext: true,
};

function resultAgainst(
  opponentName: string,
  outcome: TeamResult["outcome"],
): TeamResult {
  return {
    ...scheduleGame(`result-${opponentName}`, opponentName),
    outcome,
    outcomeLabel: outcome === "win" ? "W" : "L",
    outcomeAccessibleLabel: outcome === "win" ? "Win" : "Loss",
    score: "127-105",
    overtimeLabel: null,
  };
}

const schedule: TeamScheduleView = {
  playoffs: null,
  live: liveGame,
  upcoming: { items: [upcomingGame], showMoreLabel: null },
  results: {
    items: [resultAgainst("Heat", "win"), resultAgainst("Bulls", "loss")],
    showMoreLabel: null,
  },
  emptyUpcomingMessage: null,
};

function renderSchedule({ isAboveTheFold = false } = {}) {
  return render(
    <TeamSchedule
      schedule={schedule}
      onShowMore={() => {}}
      isAboveTheFold={isAboveTheFold}
    />,
  );
}

function logoOfGameAgainst(opponentName: string) {
  const row = screen.getByText(opponentName).closest("a");
  if (!row) throw new Error(`No game row against ${opponentName}`);
  return row.querySelector("img") as HTMLImageElement;
}

describe("TeamSchedule", () => {
  it("announces each result as a win or a loss", () => {
    renderSchedule();

    expect(screen.getByRole("link", { name: /Heat.*Win/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /Bulls.*Loss/ })).toBeDefined();
  });

  it("keeps the live score out of live regions so its updates are not announced", () => {
    const { container } = renderSchedule();

    expect(screen.getByText(liveGame.score)).toBeDefined();
    expect(
      container.querySelector("[aria-live], [role=status], [role=alert]"),
    ).toBeNull();
  });

  it("requests the opponent logos at twice their rendered size", () => {
    renderSchedule();

    const logo = logoOfGameAgainst("Knicks");
    expect(logo.getAttribute("width")).toBe("28");
    expect(logo.src).toContain("&w=56&h=56");
  });

  it("loads the logos of the first list right away and the rest lazily when the schedule opens the page", () => {
    renderSchedule({ isAboveTheFold: true });

    expect(logoOfGameAgainst("Celtics").getAttribute("loading")).toBeNull();
    expect(logoOfGameAgainst("Knicks").getAttribute("loading")).toBeNull();
    expect(logoOfGameAgainst("Heat").getAttribute("loading")).toBe("lazy");
  });

  it("loads every logo lazily when another tab opens the page", () => {
    renderSchedule();

    expect(logoOfGameAgainst("Celtics").getAttribute("loading")).toBe("lazy");
    expect(logoOfGameAgainst("Knicks").getAttribute("loading")).toBe("lazy");
  });
});
