import { INK } from "@/lib/team-colors";
import {
  GLOW_ALPHA,
  renderDefaultImage,
  renderShareImage,
  SHARE_IMAGE_CONTENT_TYPE,
  SHARE_IMAGE_SIZE,
  ShareImageHeading,
  TeamMark,
  withInlinedLogos,
} from "@/lib/share-image/render";
import type {
  ConferencesShareView,
  StandingsShareConference,
  StandingsShareRow,
} from "@/features/standings/share-view";
import { loadStandingsShareView } from "@/features/standings/share-view.server";
import { strings } from "@/lib/strings";
import { ACCENT, ELEVATED, FOREGROUND, MUTED } from "@/lib/theme-colors";

// Standings move after every game, so the image renders on every request; caching is left to Cache-Control.
export const dynamic = "force-dynamic";

// The single image this route serves; generateImageMetadata needs an id for it.
const IMAGE_ID = "preview";

const LOGO_SIZE = 52;

// Through generateImageMetadata rather than a static alt export, so the alt text names the season.
export async function generateImageMetadata() {
  const shareView = await loadStandingsShareView();
  return [
    {
      id: IMAGE_ID,
      alt: shareView.variant === "fallback" ? strings.app.name : shareView.alt,
      size: SHARE_IMAGE_SIZE,
      contentType: SHARE_IMAGE_CONTENT_TYPE,
    },
  ];
}

function StandingsRowLine({ row }: { row: StandingsShareRow }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 66,
        gap: 20,
        fontFamily: "Bebas Neue",
        fontSize: 44,
        lineHeight: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: 28,
          color: MUTED,
        }}
      >
        {row.seed}
      </div>
      <TeamMark team={row.team} size={LOGO_SIZE} />
      {/* ESPN standings carry no team colors, so the abbreviation stays neutral, as in the standings table. */}
      <div style={{ display: "flex", flex: 1, color: FOREGROUND }}>
        {row.team.abbreviation}
      </div>
      <div style={{ display: "flex", color: FOREGROUND }}>{row.record}</div>
    </div>
  );
}

function ConferenceColumn({
  conference,
}: {
  conference: StandingsShareConference;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 492,
        padding: "20px 32px",
        borderRadius: 16,
        backgroundColor: ELEVATED,
      }}
    >
      <div
        style={{
          display: "flex",
          marginBottom: 8,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: MUTED,
        }}
      >
        {conference.label}
      </div>
      {conference.rows.map((row) => (
        <StandingsRowLine key={row.seed} row={row} />
      ))}
    </div>
  );
}

function StandingsImage({ shareView }: { shareView: ConferencesShareView }) {
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <ShareImageHeading pageLabel={strings.share.pages.standings} />
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 4,
            color: MUTED,
          }}
        >
          {shareView.seasonLabel}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {shareView.conferences.map((conference) => (
          <ConferenceColumn key={conference.label} conference={conference} />
        ))}
      </div>
    </div>
  );
}

export default async function Image() {
  const shareView = await loadStandingsShareView();

  if (shareView.variant === "fallback") {
    return renderDefaultImage({ cacheSeconds: shareView.cacheSeconds });
  }

  const { teams, anyLogoFailedToLoad } = await withInlinedLogos(
    shareView.conferences.flatMap(({ rows }) => rows.map(({ team }) => team)),
  );
  let teamIndex = 0;
  const conferences = shareView.conferences.map((conference) => ({
    ...conference,
    rows: conference.rows.map((row) => ({ ...row, team: teams[teamIndex++] })),
  }));

  return renderShareImage(
    <StandingsImage shareView={{ ...shareView, conferences }} />,
    { cacheSeconds: shareView.cacheSeconds, isDegraded: anyLogoFailedToLoad },
  );
}
