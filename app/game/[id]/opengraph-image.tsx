import { loadShareView } from "@/app/lib/game/share-view.server";
import type {
  FinalShareView,
  MatchupShareView,
} from "@/app/lib/game/share-view";
import { INK } from "@/app/lib/home/team-colors";
import {
  GLOW_ALPHA,
  renderDefaultImage,
  renderShareImage,
  SHARE_IMAGE_CONTENT_TYPE,
  SHARE_IMAGE_SIZE,
  ShareImageHeading,
  TeamMark,
  withInlinedLogos,
} from "@/app/lib/share-image/render";
import type { ShareTeam } from "@/app/lib/share-image/share-image";
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

// The single image this route serves; generateImageMetadata needs an id for it.
const IMAGE_ID = "preview";

const SCORE_DIVIDER = "#3a4256";
const LOGO_SIZE = 200;

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
        shareView.variant === "fallback"
          ? strings.share.brand
          : shareView.title,
      size: SHARE_IMAGE_SIZE,
      contentType: SHARE_IMAGE_CONTENT_TYPE,
    },
  ];
}

type ImageProps = {
  params: Promise<{ id: string }>;
};

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
      <TeamMark team={team} size={LOGO_SIZE} />
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
      <ShareImageHeading />
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
    return renderDefaultImage({ cacheSeconds: shareView.cacheSeconds });
  }

  const {
    teams: [away, home],
    anyLogoFailedToLoad,
  } = await withInlinedLogos([shareView.away, shareView.home]);

  return renderShareImage(
    <ShareImage shareView={{ ...shareView, away, home }} />,
    { cacheSeconds: shareView.cacheSeconds, isDegraded: anyLogoFailedToLoad },
  );
}
