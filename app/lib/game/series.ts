import { strings } from "@/app/lib/strings";

export type SeriesSide = {
  abbreviation: string;
  wins: number;
};

// e.g. "LAL leads 3-1", "LAL wins 4-2", or "Series tied 2-2".
export function seriesLabelOf(
  first: SeriesSide,
  second: SeriesSide,
  isCompleted: boolean,
): string {
  if (first.wins === second.wins) {
    return strings.game.header.seriesTied(first.wins);
  }

  const [leader, trailer] =
    first.wins > second.wins ? [first, second] : [second, first];
  const label = isCompleted
    ? strings.game.header.seriesWon
    : strings.game.header.seriesLeads;
  return label(leader.abbreviation, leader.wins, trailer.wins);
}
