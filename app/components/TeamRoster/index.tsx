import { resizedImageUrl } from "@/app/lib/espn";
import { strings } from "@/app/lib/strings";
import type { TeamRosterPlayer } from "@/app/lib/team/team-view";

const HEADING_ID = "team-roster";
// Close to the 1040x760 aspect ratio of ESPN headshots, cropped slightly to fill the box.
const HEADSHOT_WIDTH = 32;
const HEADSHOT_HEIGHT = 24;
// Requested at twice the display size so headshots stay sharp on high-density screens.
const HEADSHOT_REQUEST_SCALE = 2;
const HEADSHOT_CLASS_NAME =
  "h-6 w-8 shrink-0 rounded-md bg-white/6 object-cover";

function Headshot({ headshotUrl }: { headshotUrl: string | null }) {
  if (!headshotUrl) {
    return <span aria-hidden="true" className={HEADSHOT_CLASS_NAME} />;
  }

  return (
    <img
      src={resizedImageUrl(
        headshotUrl,
        HEADSHOT_WIDTH * HEADSHOT_REQUEST_SCALE,
        HEADSHOT_HEIGHT * HEADSHOT_REQUEST_SCALE,
      )}
      // The name sits next to the photo, so the photo adds nothing for screen readers.
      alt=""
      width={HEADSHOT_WIDTH}
      height={HEADSHOT_HEIGHT}
      // The roster sits below the fold on desktop and in a hidden tab on mobile.
      loading="lazy"
      className={HEADSHOT_CLASS_NAME}
    />
  );
}

function InjuryStatus({ status }: { status: string }) {
  return (
    <span className="shrink-0 rounded-full border border-warning/32 bg-warning/8 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-warning-soft">
      {status}
    </span>
  );
}

export default function TeamRoster({
  players,
}: {
  players: TeamRosterPlayer[];
}) {
  const { roster } = strings.team;

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-2">
      <h2 id={HEADING_ID} className="font-display text-2xl tracking-[0.06em]">
        {roster.title}
      </h2>
      <div className="overflow-x-auto card">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-3 py-2">{roster.jersey}</th>
              <th className="px-3 py-2">{roster.player}</th>
              <th className="px-3 py-2">{roster.position}</th>
              <th className="px-3 py-2">{roster.age}</th>
              <th className="px-3 py-2">{roster.height}</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className="border-t border-white/10">
                <td className="px-3 py-2 tabular-nums">{player.jersey}</td>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2.5">
                    <Headshot headshotUrl={player.headshotUrl} />
                    {player.name}
                    {player.injuryStatus && (
                      <InjuryStatus status={player.injuryStatus} />
                    )}
                  </span>
                </td>
                <td className="px-3 py-2">{player.position}</td>
                <td className="px-3 py-2 tabular-nums">{player.age}</td>
                <td className="px-3 py-2 whitespace-nowrap">{player.height}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
