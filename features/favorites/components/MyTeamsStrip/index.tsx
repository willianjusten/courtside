"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FOCUS_RING_CLASS_NAME } from "@/features/scoreboard/components/DatePicker/DatePickerTrigger";
import TeamLogo from "@/components/TeamLogo";
import TeamPicker from "@/features/favorites/components/TeamPicker";
import { myTeamsOf, type MyTeamLink } from "@/features/favorites/my-teams";
import { useFavoriteTeamIds } from "@/features/favorites/use-favorite-team-ids";
import { teamsQueryOptions } from "@/features/teams/queries/teams";
import { strings } from "@/lib/strings";
import MyTeamsOverflow from "./MyTeamsOverflow";

const LOGO_SIZE = 28;
// Past this many, the rest collapse into a +N chip so the strip fits the mobile header.
const VISIBLE_TEAM_COUNT = 3;

function MyTeamLogoLink({ team }: { team: MyTeamLink }) {
  return (
    <Link
      href={team.href}
      aria-label={team.displayName}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full border border-favorite/40 bg-favorite/10 transition-colors hover:bg-favorite/18 ${FOCUS_RING_CLASS_NAME}`}
    >
      <TeamLogo logoUrl={team.logoUrl} size={LOGO_SIZE} />
    </Link>
  );
}

export default function MyTeamsStrip() {
  const favoriteTeamIds = useFavoriteTeamIds();
  // Only favorites need the teams list here, to resolve their names and logos.
  const { data: teams, isError } = useQuery({
    ...teamsQueryOptions(),
    enabled: favoriteTeamIds.length > 0,
  });
  // A failed teams list leaves just the picker instead of an empty strip.
  const myTeams = myTeamsOf(favoriteTeamIds, teams ?? (isError ? [] : null));

  return (
    <nav
      aria-label={strings.myTeams.label}
      className="flex min-h-11 items-center gap-2"
    >
      <TeamPicker />
      {myTeams?.slice(0, VISIBLE_TEAM_COUNT).map((team) => (
        <MyTeamLogoLink key={team.teamId} team={team} />
      ))}
      {myTeams && myTeams.length > VISIBLE_TEAM_COUNT && (
        <MyTeamsOverflow teams={myTeams.slice(VISIBLE_TEAM_COUNT)} />
      )}
    </nav>
  );
}
