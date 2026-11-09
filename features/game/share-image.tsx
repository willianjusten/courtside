import { loadShareView } from "@/features/game/share-view.server";
import type {
  FinalShareView,
  MatchupShareView,
} from "@/features/game/share-view";
import { INK } from "@/lib/team-colors";
import {
  GLOW_ALPHA,
  renderDefaultImage,
  renderShareImage,
  ShareImageHeading,
  TeamMark,
  withInlinedLogos,
} from "@/lib/share-image/render";
import type { ShareTeam } from "@/lib/share-image/share-image";
import { strings } from "@/lib/strings";
import {
  ACCENT,
  ELEVATED,
  FOREGROUND,
  LIVE,
  MUTED,
  ON_ACCENT,
  ON_LIVE,
} from "@/lib/theme-colors";
const SCORE_DIVIDER = "#3a4256";
const LOGO_SIZE = 200;

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

export async function renderGameShareImage(gameId: string) {
  const shareView = await loadShareView(gameId);

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
