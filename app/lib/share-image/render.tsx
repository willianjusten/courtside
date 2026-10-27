import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import { NBA_LOGO_URL } from "@/app/lib/espn/logos";
import { INK } from "@/app/lib/home/team-colors";
import {
  degradedImageCacheSeconds,
  INDEFINITE_CACHE_SECONDS,
  type ShareTeam,
} from "@/app/lib/share-image/share-image";
import { strings } from "@/app/lib/strings";
import { ACCENT, FOREGROUND, MUTED } from "@/app/lib/theme-colors";

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };
export const SHARE_IMAGE_CONTENT_TYPE = "image/png";

const ASSETS_DIRECTORY = join(process.cwd(), "app/lib/share-image/assets");

// Hex alpha appended to a color for the soft glows behind the content.
export const GLOW_ALPHA = "38";
// The abbreviation fills a bit under half of a mark drawn without a logo.
const ABBREVIATION_TO_MARK_RATIO = 0.44;
const DEFAULT_LOGO_SIZE = 200;

function cacheControlOf(cacheSeconds: number) {
  return cacheSeconds === INDEFINITE_CACHE_SECONDS
    ? `public, immutable, no-transform, max-age=${cacheSeconds}`
    : `public, max-age=${cacheSeconds}`;
}

// Inlining the logo up front means an unreachable logo falls back to the abbreviation instead of failing the render.
async function logoDataUrlOf(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const logoType =
      response.headers.get("content-type") ?? SHARE_IMAGE_CONTENT_TYPE;
    const logoBase64 = Buffer.from(await response.arrayBuffer()).toString(
      "base64",
    );
    return `data:${logoType};base64,${logoBase64}`;
  } catch {
    return null;
  }
}

async function withInlinedLogo(team: ShareTeam): Promise<ShareTeam> {
  return { ...team, logoUrl: await logoDataUrlOf(team.logoUrl) };
}

// Inlines every logo and tells whether any that ESPN provides failed to load, which makes the image degraded.
export async function withInlinedLogos<Teams extends ShareTeam[]>(
  teams: Teams,
): Promise<{ teams: Teams; anyLogoFailedToLoad: boolean }> {
  const inlinedTeams = await Promise.all(teams.map(withInlinedLogo));
  return {
    teams: inlinedTeams as Teams,
    anyLogoFailedToLoad: teams.some(
      (team, index) =>
        team.logoUrl !== null && inlinedTeams[index].logoUrl === null,
    ),
  };
}

async function loadFonts() {
  const [display, sansMedium, sansBold] = await Promise.all(
    [
      "BebasNeue-Regular.ttf",
      "SpaceGrotesk-500.ttf",
      "SpaceGrotesk-700.ttf",
    ].map((fileName) => readFile(join(ASSETS_DIRECTORY, fileName))),
  );
  return [
    { name: "Bebas Neue", data: display, weight: 400 as const },
    { name: "Space Grotesk", data: sansMedium, weight: 500 as const },
    { name: "Space Grotesk", data: sansBold, weight: 700 as const },
  ];
}

export async function renderShareImage(
  image: ReactElement,
  {
    cacheSeconds,
    isDegraded = false,
  }: { cacheSeconds: number; isDegraded?: boolean },
) {
  const effectiveCacheSeconds = isDegraded
    ? degradedImageCacheSeconds({ cacheSeconds })
    : cacheSeconds;
  return new ImageResponse(image, {
    ...SHARE_IMAGE_SIZE,
    fonts: await loadFonts(),
    headers: { "Cache-Control": cacheControlOf(effectiveCacheSeconds) },
  });
}

export function TeamMark({ team, size }: { team: ShareTeam; size: number }) {
  if (team.logoUrl) {
    return (
      <img
        src={team.logoUrl}
        width={size}
        height={size}
        alt={team.displayName}
      />
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: team.color,
        color: INK,
        fontFamily: "Bebas Neue",
        fontSize: Math.round(size * ABBREVIATION_TO_MARK_RATIO),
      }}
    >
      {team.abbreviation}
    </div>
  );
}

// The small brand heading every preview, optionally followed by the page it shows.
export function ShareImageHeading({ pageLabel }: { pageLabel?: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: MUTED,
      }}
    >
      <div style={{ display: "flex" }}>{strings.share.brand}</div>
      {pageLabel && (
        <div style={{ display: "flex", color: ACCENT }}>{pageLabel}</div>
      )}
    </div>
  );
}

function DefaultImage({ logoUrl }: { logoUrl: string | null }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "64px 96px",
        backgroundColor: INK,
        // The accent glow sits top right, as it does behind the app header.
        backgroundImage: `radial-gradient(circle at 100% 0%, ${ACCENT}${GLOW_ALPHA}, transparent 70%)`,
        fontFamily: "Space Grotesk",
        color: FOREGROUND,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        {logoUrl && (
          <img
            src={logoUrl}
            width={DEFAULT_LOGO_SIZE}
            height={DEFAULT_LOGO_SIZE}
            alt=""
          />
        )}
        <div
          style={{
            display: "flex",
            fontFamily: "Bebas Neue",
            fontSize: 200,
            lineHeight: 1,
          }}
        >
          <div style={{ display: "flex" }}>{strings.share.wordmark.lead}</div>
          <div style={{ display: "flex", color: ACCENT }}>
            {strings.share.wordmark.accent}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 40,
          fontSize: 36,
          fontWeight: 500,
          color: MUTED,
        }}
      >
        {strings.app.description}
      </div>
    </div>
  );
}

// The app's default preview, for pages without their own and for any preview that could not be drawn.
export async function renderDefaultImage({
  cacheSeconds,
}: {
  cacheSeconds: number;
}) {
  const logoUrl = await logoDataUrlOf(NBA_LOGO_URL);
  return renderShareImage(<DefaultImage logoUrl={logoUrl} />, {
    cacheSeconds,
    isDegraded: logoUrl === null,
  });
}
