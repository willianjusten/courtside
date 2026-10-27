import type { SlateMatchup, SlateShareView } from "@/app/lib/home/share-view";
import { loadHomeShareView } from "@/app/lib/home/share-view.server";
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
import { strings } from "@/app/lib/strings";
import { ACCENT, ELEVATED, FOREGROUND, MUTED } from "@/app/lib/theme-colors";

// The slate follows the current NBA date, so the image renders on every request; caching is left to Cache-Control.
export const dynamic = "force-dynamic";

// The single image this route serves; generateImageMetadata needs an id for it.
const IMAGE_ID = "preview";

const LOGO_SIZE = 60;
const MATCHUP_DIVIDER = "#3a4256";

// Through generateImageMetadata rather than a static alt export, so the alt text names the day.
export async function generateImageMetadata() {
  const shareView = await loadHomeShareView();
  return [
    {
      id: IMAGE_ID,
      alt: shareView.variant === "fallback" ? strings.app.name : shareView.alt,
      size: SHARE_IMAGE_SIZE,
      contentType: SHARE_IMAGE_CONTENT_TYPE,
    },
  ];
}

function MatchupTile({ matchup }: { matchup: SlateMatchup }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: 316,
        height: 112,
        padding: "0 18px",
        borderRadius: 16,
        backgroundColor: ELEVATED,
        fontFamily: "Bebas Neue",
        fontSize: 36,
        lineHeight: 1,
      }}
    >
      <TeamMark team={matchup.away} size={LOGO_SIZE} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", color: matchup.away.color }}>
          {matchup.away.abbreviation}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: MATCHUP_DIVIDER }}>
          {strings.share.versus}
        </div>
        <div style={{ display: "flex", color: matchup.home.color }}>
          {matchup.home.abbreviation}
        </div>
      </div>
      <TeamMark team={matchup.home} size={LOGO_SIZE} />
    </div>
  );
}

function SlateImage({ shareView }: { shareView: SlateShareView }) {
  const { dateLabel, gamesLabel, matchups, moreLabel } = shareView;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "48px 64px",
        backgroundColor: INK,
        backgroundImage: `radial-gradient(circle at 100% 0%, ${ACCENT}${GLOW_ALPHA}, transparent 60%)`,
        fontFamily: "Space Grotesk",
        color: FOREGROUND,
      }}
    >
      <ShareImageHeading pageLabel={strings.share.pages.today} />
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 400 }}>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            {dateLabel}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 8,
              fontFamily: "Bebas Neue",
              fontSize: 120,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {gamesLabel}
          </div>
          {moreLabel && (
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontSize: 28,
                fontWeight: 700,
                color: ACCENT,
              }}
            >
              {moreLabel}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            width: 648,
            gap: 16,
          }}
        >
          {matchups.map((matchup, index) => (
            <MatchupTile key={index} matchup={matchup} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function Image() {
  const shareView = await loadHomeShareView();

  if (shareView.variant === "fallback") {
    return renderDefaultImage({ cacheSeconds: shareView.cacheSeconds });
  }

  const { teams, anyLogoFailedToLoad } = await withInlinedLogos(
    shareView.matchups.flatMap(({ away, home }) => [away, home]),
  );
  const matchups = shareView.matchups.map((_, index) => ({
    away: teams[index * 2],
    home: teams[index * 2 + 1],
  }));

  return renderShareImage(
    <SlateImage shareView={{ ...shareView, matchups }} />,
    { cacheSeconds: shareView.cacheSeconds, isDegraded: anyLogoFailedToLoad },
  );
}
