export type StreakKind = "win" | "loss";

// ESPN streaks read "W3" or "L1".
export function streakKindOf(streak: string | null): StreakKind | null {
  if (!streak) return null;
  return streak.startsWith("W") ? "win" : "loss";
}
