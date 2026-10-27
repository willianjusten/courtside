import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import {
  degradedImageCacheSeconds,
  INDEFINITE_CACHE_SECONDS,
  type FinalShareView,
  type MatchupShareView,
  type ShareTeam,
} from "@/app/lib/game/share-view";
import { loadShareView } from "@/app/lib/game/share-view.server";
import { INK } from "@/app/lib/home/team-colors";
import { strings } from "@/app/lib/strings";
import {
  ACCENT,
  ELEVATED,
  FOREGROUND,
  LIVE,
  MUTED,
  ON_ACCENT,
  ON_LIVE,
} from "@/app/lib/theme-colors";

// The image follows the game's live status, so it renders on every request; caching is left to Cache-Control.
export const dynamic = "force-dynamic";

const SIZE = { width: 1200, height: 630 };
const CONTENT_TYPE = "image/png";
// The single image this route serves; generateImageMetadata needs an id for it.
const IMAGE_ID = "preview";
const ASSETS_DIRECTORY = join(process.cwd(), "app/game/[id]/assets");
const DEFAULT_IMAGE_PATH = join(process.cwd(), "app/opengraph-image.png");

const SCORE_DIVIDER = "#3a4256";
const LOGO_SIZE = 200;
// Hex alpha appended to a team color for the glow behind its side.
const GLOW_ALPHA = "38";

// Through generateImageMetadata rather than a static alt export, so the alt text names the game.
export async function generateImageMetadata({
  params,
}: {
  params: { id: string };
}) {
  const shareView = await loadShareView(params.id);
  return [
    {
      id: IMAGE_ID,
      alt:
        shareView.variant === "fallback" ? strings.app.name : shareView.title,
      size: SIZE,
      contentType: CONTENT_TYPE,
    },
  ];
}

type ImageProps = {
  params: Promise<{ id: string }>;
};

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
    const logoType = response.headers.get("content-type") ?? CONTENT_TYPE;
    const logoBase64 = Buffer.from(await response.arrayBuffer()).toString(
      "base64",
    );
    return `data:${logoType};base64,${logoBase64}`;
  } catch {
    return null;
  }
}

function logoFailedToLoad(team: ShareTeam, inlinedTeam: ShareTeam) {
  return team.logoUrl !== null && inlinedTeam.logoUrl === null;
}

async function withInlinedLogo(team: ShareTeam): Promise<ShareTeam> {
  return { ...team, logoUrl: await logoDataUrlOf(team.logoUrl) };
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

function TeamMark({ team }: { team: ShareTeam }) {
  if (team.logoUrl) {
    return (
      <img
        src={team.logoUrl}
        width={LOGO_SIZE}
        height={LOGO_SIZE}
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
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        borderRadius: LOGO_SIZE / 2,
        backgroundColor: team.color,
        color: INK,
        fontFamily: "Bebas Neue",
        fontSize: 88,
      }}
    >
      {team.abbreviation}
    </div>
  );
}

function TeamColumn({ team }: { team: ShareTeam }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 300,
      }}
    >
      <TeamMark team={team} />
      <div
        style={{
          marginTop: 20,
          fontFamily: "Bebas Neue",
          fontSize: 72,
          lineHeight: 1,
          color: team.color,
        }}
      >
        {team.abbreviation}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 24,
          fontWeight: 500,
          color: MUTED,
          textAlign: "center",
        }}
      >
        {team.displayName}
      </div>
    </div>
  );
}

function Score({ points, isDimmed }: { points: number; isDimmed: boolean }) {
  return (
    <div style={{ display: "flex", color: isDimmed ? MUTED : FOREGROUND }}>
      {points}
    </div>
  );
}

// The accent marks a result and the live red a game in progress, as in the app; an upcoming date stays neutral, and a game that won't be played as scheduled is muted.
const STATUS_PILL_COLORS: Record<
  MatchupShareView["variant"],
  { backgroundColor: string; color: string }
> = {
  scheduled: { backgroundColor: ELEVATED, color: FOREGROUND },
  "in-progress": { backgroundColor: LIVE, color: ON_LIVE },
  final: { backgroundColor: ACCENT, color: ON_ACCENT },
  postponed: { backgroundColor: ELEVATED, color: MUTED },
  canceled: { backgroundColor: ELEVATED, color: MUTED },
};

function FinalScore({ shareView }: { shareView: FinalShareView }) {
  const { score, winningSide } = shareView;
  return (
    <>
      <Score points={score.away} isDimmed={winningSide === "home"} />
      <div style={{ display: "flex", fontSize: 96, color: SCORE_DIVIDER }}>
        -
      </div>
      <Score points={score.home} isDimmed={winningSide === "away"} />
    </>
  );
}

function ShareImage({ shareView }: { shareView: MatchupShareView }) {
  const { away, home, statusLabel } = shareView;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "48px 64px",
        backgroundColor: INK,
        backgroundImage: `radial-gradient(circle at 15% 50%, ${away.color}${GLOW_ALPHA}, transparent 45%), radial-gradient(circle at 85% 50%, ${home.color}${GLOW_ALPHA}, transparent 45%)`,
        fontFamily: "Space Grotesk",
        color: FOREGROUND,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: MUTED,
        }}
      >
        {strings.app.name}
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TeamColumn team={away} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              fontFamily: "Bebas Neue",
              fontSize: 168,
              lineHeight: 1,
            }}
          >
            {shareView.variant === "final" ? (
              <FinalScore shareView={shareView} />
            ) : (
              <div style={{ display: "flex", color: SCORE_DIVIDER }}>
                {strings.share.versus}
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 16,
              padding: "8px 22px",
              borderRadius: 999,
              ...STATUS_PILL_COLORS[shareView.variant],
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {statusLabel}
          </div>
        </div>
        <TeamColumn team={home} />
      </div>
    </div>
  );
}

export default async function Image({ params }: ImageProps) {
  const { id } = await params;
  const shareView = await loadShareView(id);

  if (shareView.variant === "fallback") {
    return new Response(await readFile(DEFAULT_IMAGE_PATH), {
      headers: {
        "Content-Type": CONTENT_TYPE,
        "Cache-Control": cacheControlOf(shareView.cacheSeconds),
      },
    });
  }

  const [away, home, fonts] = await Promise.all([
    withInlinedLogo(shareView.away),
    withInlinedLogo(shareView.home),
    loadFonts(),
  ]);
  const anyLogoFailedToLoad =
    logoFailedToLoad(shareView.away, away) ||
    logoFailedToLoad(shareView.home, home);
  const cacheSeconds = anyLogoFailedToLoad
    ? degradedImageCacheSeconds(shareView)
    : shareView.cacheSeconds;

  return new ImageResponse(
    <ShareImage shareView={{ ...shareView, away, home }} />,
    {
      ...SIZE,
      fonts,
      headers: { "Cache-Control": cacheControlOf(cacheSeconds) },
    },
  );
}
