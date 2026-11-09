import type { NbaDate } from "@/types/nba-date";

const formattersByTimeZone = new Map<
  string,
  {
    time: Intl.DateTimeFormat;
    weekday: Intl.DateTimeFormat;
    monthDay: Intl.DateTimeFormat;
    date: Intl.DateTimeFormat;
  }
>();

function formattersFor(timeZone: string) {
  let formatters = formattersByTimeZone.get(timeZone);
  if (!formatters) {
    formatters = {
      time: new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        minute: "2-digit",
      }),
      weekday: new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }),
      monthDay: new Intl.DateTimeFormat("en-US", {
        timeZone,
        month: "short",
        day: "numeric",
      }),
      // en-CA formats dates as YYYY-MM-DD, the NbaDate shape.
      date: new Intl.DateTimeFormat("en-CA", { timeZone }),
    };
    formattersByTimeZone.set(timeZone, formatters);
  }
  return formatters;
}

// A late ET tip-off can land on the next local day, so the weekday is added whenever the local day differs.
export function formatTipOff(
  startTime: string,
  nbaDate: NbaDate,
  timeZone: string,
) {
  const formatters = formattersFor(timeZone);
  const startInstant = new Date(startTime);
  const localTime = formatters.time.format(startInstant);

  return formatters.date.format(startInstant) === nbaDate
    ? localTime
    : `${formatters.weekday.format(startInstant)} ${localTime}`;
}

export function formatLocalTime(startTime: string, timeZone: string) {
  return formattersFor(timeZone).time.format(new Date(startTime));
}

export type TipOffDay = {
  // e.g. "Fri".
  weekday: string;
  // e.g. "Oct 23".
  monthDay: string;
};

// The local day of the tip-off; until the browser timezone is known, the NBA date, formatted in UTC so it isn't shifted.
export function formatTipOffDay(
  startTime: string,
  nbaDate: NbaDate,
  timeZone: string | null,
): TipOffDay {
  const formatters = formattersFor(timeZone ?? "UTC");
  const day = timeZone ? new Date(startTime) : new Date(`${nbaDate}T00:00:00Z`);
  return {
    weekday: formatters.weekday.format(day),
    monthDay: formatters.monthDay.format(day),
  };
}
