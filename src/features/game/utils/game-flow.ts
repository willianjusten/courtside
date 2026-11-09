import type { GameStatus } from "@/types/game";
import type { GameSummary, Play } from "@/types/game-summary";
import { periodLabel, REGULATION_PERIODS } from "@/utils/game-status";
import { readableTeamColors, type TeamSide } from "@/utils/team-colors";
import { strings } from "@/config/strings";

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
  // The other team's points during the run, at most one basket.
  allowedPoints: number;
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

// Points the other team may score inside a run: one basket, as in a 12-2 run.
const MAX_RUN_ALLOWED_POINTS = 3;

type Score = {
  homeScore: number;
  awayScore: number;
};

type Basket = {
  side: TeamSide;
  points: number;
  scoreBefore: Score;
  scoreAfter: Score;
};

type Run = {
  side: TeamSide;
  points: number;
  allowedPoints: number;
  scoreBefore: Score;
  scoreAfter: Score;
};

// Every score change as one team's basket; a play where both scores move counts the home points first.
function basketsOf(plays: Play[]): Basket[] {
  let previous: Score = { homeScore: 0, awayScore: 0 };
  const baskets: Basket[] = [];

  for (const play of plays) {
    const afterHome = { ...previous, homeScore: play.homeScore };
    if (play.homeScore > previous.homeScore) {
      baskets.push({
        side: "home",
        points: play.homeScore - previous.homeScore,
        scoreBefore: previous,
        scoreAfter: afterHome,
      });
    }
    if (play.awayScore > previous.awayScore) {
      baskets.push({
        side: "away",
        points: play.awayScore - previous.awayScore,
        scoreBefore: afterHome,
        scoreAfter: { ...afterHome, awayScore: play.awayScore },
      });
    }
    previous = { homeScore: play.homeScore, awayScore: play.awayScore };
  }

  return baskets;
}

const isBetterRun = (run: Run, bestRun: Run | null) =>
  !bestRun ||
  run.points > bestRun.points ||
  (run.points === bestRun.points && run.allowedPoints < bestRun.allowedPoints);

// The stretch where one team scores the most while the other scores at most one basket.
// It starts and ends on the running team's baskets; on a tie, fewer points allowed, then the earlier run, win.
function bestRunOf(plays: Play[]): Run | null {
  const baskets = basketsOf(plays);
  let bestRun: Run | null = null;

  for (const [startIndex, firstBasket] of baskets.entries()) {
    let points = 0;
    let allowedPoints = 0;
    for (const basket of baskets.slice(startIndex)) {
      if (basket.side !== firstBasket.side) {
        allowedPoints += basket.points;
        if (allowedPoints > MAX_RUN_ALLOWED_POINTS) break;
        continue;
      }
      points += basket.points;
      const run: Run = {
        side: firstBasket.side,
        points,
        allowedPoints,
        scoreBefore: firstBasket.scoreBefore,
        scoreAfter: basket.scoreAfter,
      };
      if (isBetterRun(run, bestRun)) bestRun = run;
    }
  }

  return bestRun;
}

const scoreOf = ({ awayScore, homeScore }: Score) =>
  strings.game.plays.score(awayScore, homeScore);

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
      allowedPoints: bestRun.allowedPoints,
      label: flow.run(
        abbreviations[bestRun.side],
        bestRun.points,
        bestRun.allowedPoints,
      ),
      spanLabel: flow.runSpan(
        scoreOf(bestRun.scoreBefore),
        scoreOf(bestRun.scoreAfter),
      ),
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
