import type { Team } from "@/lib/domain/game";

export type TeamSide = "home" | "away";

export const INK = "#080b14";

// Foundations rule: a team color must reach 3:1 against Ink to stay visible on the dark ground.
const MINIMUM_CONTRAST = 3;
const LIGHTEN_STEP = 0.05;
// Below this RGB distance (out of ~441) two team colors read as the same color side by side.
const ALIKE_DISTANCE = 64;
const NEUTRAL_TEAM_COLOR = "#9aa3b5";

type Rgb = [number, number, number];

function toRgb(hexColor: string): Rgb {
  const hex = hexColor.replace("#", "");
  return [0, 2, 4].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  ) as Rgb;
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

// WCAG relative luminance.
function luminanceOf(hexColor: string) {
  const [red, green, blue] = toRgb(hexColor).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(firstColor: string, secondColor: string) {
  const [lighter, darker] = [
    luminanceOf(firstColor),
    luminanceOf(secondColor),
  ].toSorted((first, second) => second - first);
  return (lighter + 0.05) / (darker + 0.05);
}

const isReadable = (hexColor: string) =>
  contrastRatio(hexColor, INK) >= MINIMUM_CONTRAST;

function lightenUntilReadable(hexColor: string) {
  const rgb = toRgb(hexColor);
  let lightened = hexColor;
  for (let whiteShare = 0; !isReadable(lightened); whiteShare += LIGHTEN_STEP) {
    lightened = toHex(
      rgb.map((channel) => channel + (255 - channel) * whiteShare) as Rgb,
    );
  }
  return lightened;
}

function looksAlike(firstColor: string, secondColor: string) {
  const [first, second] = [toRgb(firstColor), toRgb(secondColor)];
  return (
    Math.hypot(...first.map((channel, index) => channel - second[index])) <
    ALIKE_DISTANCE
  );
}

// Readable options in rule order: the primary, the alternate, then each lightened.
// The lightened alternate is a last resort for an away team whose readable primary looks like the home color.
function readableOptionsOf(team: Team): string[] {
  const [primary, alternate] = [team.color, team.alternateColor].map((color) =>
    color ? `#${color.toLowerCase()}` : null,
  );
  if (!primary && !alternate) return [NEUTRAL_TEAM_COLOR];

  const baseColors = [primary, alternate];
  return baseColors
    .concat(baseColors.map((color) => color && lightenUntilReadable(color)))
    .filter((color): color is string => color !== null && isReadable(color));
}

export function readableTeamColor(team: Team) {
  return readableOptionsOf(team)[0];
}

export function readableTeamColors(
  home: Team,
  away: Team,
): Record<TeamSide, string> {
  const [homeColor] = readableOptionsOf(home);
  const awayOptions = readableOptionsOf(away);

  return {
    home: homeColor,
    away:
      awayOptions.find((color) => !looksAlike(color, homeColor)) ??
      awayOptions[0],
  };
}
