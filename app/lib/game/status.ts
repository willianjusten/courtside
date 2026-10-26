import type { Game, GameStatus } from "@/app/lib/domain/game";
import type { TeamSide } from "@/app/lib/home/team-colors";
import { strings } from "@/app/lib/strings";

export const REGULATION_PERIODS = 4;
const STATUSES_WITHOUT_SCORE: ReadonlyArray<GameStatus["kind"]> = [
  "scheduled",
  "postponed",
  "canceled",
];

export function hasScore(status: GameStatus) {
  return !STATUSES_WITHOUT_SCORE.includes(status.kind);
}

export type InProgressStatus = Extract<
  GameStatus,
  { kind: "live" | "halftime" }
>;

export function isInProgress(status: GameStatus): status is InProgressStatus {
  return status.kind === "live" || status.kind === "halftime";
}

function wentToOvertime(period: number) {
  return period > REGULATION_PERIODS;
}

export function overtimeLabelOf(period: number): string | null {
  return wentToOvertime(period) ? periodLabel(period) : null;
}

export function periodLabel(period: number) {
  return wentToOvertime(period)
    ? strings.gameStatus.overtime(period - REGULATION_PERIODS)
    : strings.gameStatus.quarter(period);
}

// e.g. "Q3 4:21" or "Halftime".
export function inProgressLabelOf(status: InProgressStatus) {
  return status.kind === "live"
    ? `${periodLabel(status.period)} ${status.clock}`
    : strings.gameStatus.halftime;
}

export function finalLabel(period: number) {
  return wentToOvertime(period)
    ? strings.gameStatus.finalAfter(periodLabel(period))
    : strings.gameStatus.final;
}

export function leadingSideOf({ status, home, away }: Game): TeamSide | null {
  if (!hasScore(status) || home.score === away.score) return null;
  return home.score > away.score ? "home" : "away";
}

// The mapper keeps only ESPN, Prime Video, and NBA League Pass, falling back to League Pass, so the label is never empty.
export function channelLabelOf({ broadcasts }: Game) {
  return broadcasts
    .map((broadcast) => broadcast.name)
    .join(strings.broadcast.separator);
}
