import type { GameStatus } from "@/app/lib/domain/game";
import type { GameSummary, Play } from "@/app/lib/domain/game-summary";
import { periodLabel, REGULATION_PERIODS } from "@/app/lib/game/status";
import { readableTeamColors, type TeamSide } from "@/app/lib/home/team-colors";
import { strings } from "@/app/lib/strings";

const REGULATION_PERIOD_SECONDS = 12 * 60;
const OVERTIME_PERIOD_SECONDS = 5 * 60;
const SECONDS_PER_SAMPLE = 60;
// The margin scale rounds up to a multiple of this, so its labels read as clean numbers.
const MARGIN_SCALE_STEP = 5;
const FIRST_PERIOD_AFTER_HALFTIME = 3;

// A point on the chart: x runs from 0 at tip-off to 1 at the end of the last period,
// y from -1 to 1, with the home team above zero and the away team below.
export type GameFlowPoint = {
  x: number;
  y: number;
};

export type GameFlowSeries = {
  points: GameFlowPoint[];
  // The labels at the top (home) and bottom (away) of the scale.
  topLabel: string;
  bottomLabel: string;
  caption: string;
};

export type GameFlowLeadSeries = GameFlowSeries & {
  // The margin y = 1 stands for: the largest lead rounded up to a clean step.
  scale: number;
};

// The line drawn where a period starts: a quarter, halftime, or the start of an overtime.
export type GameFlowMarker = "quarter" | "half" | "overtime";

export type GameFlowPeriod = {
  label: string;
  start: number;
  end: number;
  // Null for the first period, which starts at the edge of the chart.
  marker: GameFlowMarker | null;
};

export type GameFlowTeam = {
  abbreviation: string;
  // Readable on the dark ground and apart from the other team's color.
  color: string;
};

export type GameFlowRun = {
  side: TeamSide;
  points: number;
  label: string;
  // The score, away first, before and after the run.
  spanLabel: string;
};

export type GameFlowView = {
  home: GameFlowTeam;
  away: GameFlowTeam;
  // A live game's chart ends at the current clock, where a marker shows the latest margin.
  isLive: boolean;
  periods: GameFlowPeriod[];
  lead: GameFlowLeadSeries;
  // Null when ESPN has no win probability for the game.
  winProbability: GameFlowSeries | null;
  largestLead: { away: number; home: number; label: string };
  leadChanges: number;
  timesTied: number;
  // Null until a team scores.
  bestRun: GameFlowRun | null;
  // The chart in plain text for screen readers.
  summary: string;
};

type TimedValue = {
  seconds: number;
  value: number;
};

const periodStartSeconds = (period: number) =>
  period <= REGULATION_PERIODS
    ? (period - 1) * REGULATION_PERIOD_SECONDS
    : REGULATION_PERIODS * REGULATION_PERIOD_SECONDS +
      (period - REGULATION_PERIODS - 1) * OVERTIME_PERIOD_SECONDS;

const periodSeconds = (period: number) =>
  period <= REGULATION_PERIODS
    ? REGULATION_PERIOD_SECONDS
    : OVERTIME_PERIOD_SECONDS;

const periodEndSeconds = (period: number) =>
  periodStartSeconds(period) + periodSeconds(period);

// ESPN's clock reads "11:45", or "54.8" in a period's last minute.
function clockSecondsOf(clock: string) {
  const [minutes, seconds] = clock.includes(":")
    ? clock.split(":").map(Number)
    : [0, Number(clock)];
  return minutes * 60 + seconds;
}

function elapsedSecondsOf(period: number, clock: string) {
  return periodEndSeconds(period) - clockSecondsOf(clock);
}

function statusElapsedSeconds(status: GameStatus): number | null {
  switch (status.kind) {
    case "live":
      return elapsedSecondsOf(status.period, status.clock);
    case "halftime":
      return periodEndSeconds(status.period);
    default:
      return null;
  }
}

// The value at each elapsed minute, then at the end when it falls between minutes.
// Before the first timed value, the first one stands in.
function sampleOf(values: TimedValue[], endSeconds: number): TimedValue[] {
  const sampleSeconds = Array.from(
    { length: Math.floor(endSeconds / SECONDS_PER_SAMPLE) + 1 },
    (_, index) => index * SECONDS_PER_SAMPLE,
  );
  if (sampleSeconds.at(-1) !== endSeconds) sampleSeconds.push(endSeconds);

  let valueIndex = 0;
  return sampleSeconds.map((seconds) => {
    while (
      valueIndex + 1 < values.length &&
      values[valueIndex + 1].seconds <= seconds
    ) {
      valueIndex++;
    }
    return { seconds, value: values[valueIndex].value };
  });
}

// Where the line crosses zero between two samples, a point on the zero line closes each team's area there.
function withZeroCrossings(points: GameFlowPoint[]): GameFlowPoint[] {
  return points.flatMap((point, index) => {
    const previous = points[index - 1];
    if (!previous || previous.y * point.y >= 0) return [point];
    const crossingX =
      previous.x +
      ((point.x - previous.x) * previous.y) / (previous.y - point.y);
    return [{ x: crossingX, y: 0 }, point];
  });
}

function pointsOf(
  samples: TimedValue[],
  durationSeconds: number,
  toY: (value: number) => number,
) {
  return withZeroCrossings(
    samples.map(({ seconds, value }) => ({
      x: seconds / durationSeconds,
      y: toY(value),
    })),
  );
}

function markerOf(period: number): GameFlowMarker | null {
  if (period === 1) return null;
  if (period === FIRST_PERIOD_AFTER_HALFTIME) return "half";
  return period > REGULATION_PERIODS ? "overtime" : "quarter";
}

const marginOf = ({ homeScore, awayScore }: Play) => homeScore - awayScore;

const sideOfMargin = (margin: number): TeamSide | null =>
  margin === 0 ? null : margin > 0 ? "home" : "away";

function leadNumbersOf(plays: Play[]) {
  let leadingSide: TeamSide | null = null;
  let previousMargin = 0;
  let leadChanges = 0;
  let timesTied = 0;
  let largestHomeLead = 0;
  let largestAwayLead = 0;

  for (const play of plays) {
    const margin = marginOf(play);
    const side = sideOfMargin(margin);
    if (side && leadingSide && side !== leadingSide) leadChanges++;
    if (side) leadingSide = side;
    if (margin === 0 && previousMargin !== 0) timesTied++;
    largestHomeLead = Math.max(largestHomeLead, margin);
    largestAwayLead = Math.max(largestAwayLead, -margin);
    previousMargin = margin;
  }

  return { leadChanges, timesTied, largestHomeLead, largestAwayLead };
}

type Run = {
  side: TeamSide;
  points: number;
  fromScore: string;
  toScore: string;
};

// A run is broken only when the other team scores; a play where both scores move ends it too.
function bestRunOf(plays: Play[]): Run | null {
  const { score } = strings.game.plays;
  let previous = { homeScore: 0, awayScore: 0 };
  let currentRun = null as Run | null;
  let bestRun = null as Run | null;

  for (const play of plays) {
    const homePoints = play.homeScore - previous.homeScore;
    const awayPoints = play.awayScore - previous.awayScore;
    const scoringSide: TeamSide | null =
      homePoints > 0 && awayPoints === 0
        ? "home"
        : awayPoints > 0 && homePoints === 0
          ? "away"
          : null;

    if (scoringSide) {
      if (currentRun?.side !== scoringSide) {
        currentRun = {
          side: scoringSide,
          points: 0,
          fromScore: score(previous.awayScore, previous.homeScore),
          toScore: "",
        };
      }
      currentRun.points += scoringSide === "home" ? homePoints : awayPoints;
      currentRun.toScore = score(play.awayScore, play.homeScore);
      if (!bestRun || currentRun.points > bestRun.points) {
        bestRun = { ...currentRun };
      }
    } else if (homePoints > 0 && awayPoints > 0) {
      currentRun = null;
    }
    previous = play;
  }

  return bestRun;
}

export function gameFlowOf(summary: GameSummary): GameFlowView | null {
  const { game, plays } = summary;
  if (plays.length === 0) return null;

  const { flow } = strings.game;
  const { home, away, status } = game;
  const abbreviations = {
    home: home.team.abbreviation,
    away: away.team.abbreviation,
  };
  const teamNames = {
    home: home.team.displayName,
    away: away.team.displayName,
  };
  const colors = readableTeamColors(home.team, away.team);

  const lastPeriod = Math.max(
    REGULATION_PERIODS,
    "period" in status ? status.period : 0,
    ...plays.map(({ period }) => period),
  );
  const durationSeconds = periodEndSeconds(lastPeriod);

  const playSeconds = plays.map(({ period, clock }) =>
    elapsedSecondsOf(period, clock),
  );
  const isLive = status.kind === "live" || status.kind === "halftime";
  const endSeconds = isLive
    ? Math.max(statusElapsedSeconds(status) ?? 0, ...playSeconds)
    : durationSeconds;

  // Tip-off starts level; every play then sets the margin from its time on.
  const margins: TimedValue[] = [
    { seconds: 0, value: 0 },
    ...plays.map((play, index) => ({
      seconds: playSeconds[index],
      value: marginOf(play),
    })),
  ];
  const { leadChanges, timesTied, largestHomeLead, largestAwayLead } =
    leadNumbersOf(plays);
  const largestMargin = Math.max(largestHomeLead, largestAwayLead);
  const scale = Math.max(
    MARGIN_SCALE_STEP,
    Math.ceil(largestMargin / MARGIN_SCALE_STEP) * MARGIN_SCALE_STEP,
  );

  const currentMargin = home.score - away.score;
  const currentLeader = sideOfMargin(currentMargin);
  const marginPoints = Math.abs(currentMargin);
  const overtimeCount = lastPeriod - REGULATION_PERIODS;
  const leadCaption = isLive
    ? currentLeader
      ? flow.marginNow(abbreviations[currentLeader], marginPoints)
      : flow.tiedNow
    : flow.wonBy(
        abbreviations[currentLeader ?? "home"],
        marginPoints,
        overtimeCount > 0 ? periodLabel(lastPeriod) : null,
      );

  const secondsByPlayId = new Map(
    plays.map(({ id }, index) => [id, playSeconds[index]]),
  );
  const winProbabilities = summary.winProbability.flatMap(
    ({ playId, homeWinPercentage }) => {
      const seconds = secondsByPlayId.get(playId);
      return seconds === undefined
        ? []
        : [{ seconds, value: homeWinPercentage }];
    },
  );
  const latestHomeWinPercentage = winProbabilities.at(-1)?.value ?? 0;
  const favoredSide: TeamSide =
    latestHomeWinPercentage >= 0.5 ? "home" : "away";
  const favoredPercent = Math.round(
    (favoredSide === "home"
      ? latestHomeWinPercentage
      : 1 - latestHomeWinPercentage) * 100,
  );

  const bestRun = bestRunOf(plays);
  const finalMarginSummary = isLive
    ? currentLeader
      ? flow.screenReader.leads(teamNames[currentLeader], marginPoints)
      : flow.screenReader.tied
    : flow.screenReader.wonBy(
        teamNames[currentLeader ?? "home"],
        marginPoints,
        overtimeCount,
      );

  return {
    home: { abbreviation: abbreviations.home, color: colors.home },
    away: { abbreviation: abbreviations.away, color: colors.away },
    isLive,
    periods: Array.from({ length: lastPeriod }, (_, index) => {
      const period = index + 1;
      return {
        label: periodLabel(period),
        start: periodStartSeconds(period) / durationSeconds,
        end: periodEndSeconds(period) / durationSeconds,
        marker: markerOf(period),
      };
    }),
    lead: {
      points: pointsOf(
        sampleOf(margins, endSeconds),
        durationSeconds,
        (margin) => margin / scale,
      ),
      scale,
      topLabel: flow.homeLeads(abbreviations.home, scale),
      bottomLabel: flow.awayLeads(abbreviations.away, scale),
      caption: leadCaption,
    },
    winProbability:
      winProbabilities.length === 0
        ? null
        : {
            points: pointsOf(
              sampleOf(winProbabilities, endSeconds),
              durationSeconds,
              (homeWinPercentage) => (homeWinPercentage - 0.5) * 2,
            ),
            topLabel: flow.certain(abbreviations.home),
            bottomLabel: flow.certain(abbreviations.away),
            caption: isLive
              ? flow.toWin(abbreviations[favoredSide], favoredPercent)
              : flow.winProbability,
          },
    largestLead: {
      away: largestAwayLead,
      home: largestHomeLead,
      label: flow.largestLeadValue(
        abbreviations.away,
        largestAwayLead,
        abbreviations.home,
        largestHomeLead,
      ),
    },
    leadChanges,
    timesTied,
    bestRun: bestRun && {
      side: bestRun.side,
      points: bestRun.points,
      label: flow.run(abbreviations[bestRun.side], bestRun.points),
      spanLabel: flow.runSpan(bestRun.fromScore, bestRun.toScore),
    },
    summary: [
      flow.screenReader.title,
      flow.screenReader.largestLead(
        teamNames.away,
        largestAwayLead,
        teamNames.home,
        largestHomeLead,
      ),
      flow.screenReader.leadChanges(leadChanges),
      finalMarginSummary,
    ].join(" "),
  };
}
