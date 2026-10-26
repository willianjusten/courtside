import type { TeamSlug } from "@/app/lib/domain/team";

export function teamSlugOf(teamName: string): TeamSlug {
  return teamName.toLowerCase().trim().replaceAll(/\s+/g, "-");
}

export function teamPathOf(teamName: string) {
  return `/teams/${teamSlugOf(teamName)}`;
}
