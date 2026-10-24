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

export function isInProgress(status: GameStatus) {
  return status.kind === "live" || status.kind === "halftime";
}

function wentToOvertime(period: number) {
  return period > REGULATION_PERIODS;
}

export function periodLabel(period: number) {
  return wentToOvertime(period)
    ? strings.gameStatus.overtime(period - REGULATION_PERIODS)
    : strings.gameStatus.quarter(period);
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
