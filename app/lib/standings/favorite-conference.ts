import type { ConferenceStandings } from "@/app/lib/domain/standings";

const DEFAULT_CONFERENCE_ABBREVIATION = "West";

// The conference of the first favorite team that plays in one, in the order the fan picked them.
function conferenceOfFavorites(
  conferences: ConferenceStandings[],
  favoriteTeamIds: string[],
) {
  for (const teamId of favoriteTeamIds) {
    const conference = conferences.find((candidate) =>
      candidate.rows.some((row) => row.team.id === teamId),
    );
    if (conference) return conference;
  }
  return null;
}

// Fans land on their first favorite team's conference, otherwise on the West.
export function defaultConferenceOf(
  conferences: ConferenceStandings[],
  favoriteTeamIds: string[],
): ConferenceStandings | undefined {
  return (
    conferenceOfFavorites(conferences, favoriteTeamIds) ??
    conferences.find(
      (conference) =>
        conference.abbreviation === DEFAULT_CONFERENCE_ABBREVIATION,
    ) ??
    conferences[0]
  );
}
