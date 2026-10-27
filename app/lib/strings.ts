import type { GamesSummary } from "@/app/lib/home/home-view";
import type { SidebarRunnerUp } from "@/app/lib/home/sidebar";

export const strings = {
  app: {
    name: "Courtside",
    description: "NBA scores, standings, and playoffs.",
  },
  common: {
    comingSoon: "Coming soon.",
    retry: "Try again",
    retrying: "Trying again...",
  },
  shell: {
    logoLabel: "NBA home",
    primaryNavigation: "Primary",
    bottomNavigation: "Sections",
    sections: {
      games: "Games",
      standings: "Standings",
      playoffs: "Playoffs",
    },
    footer: {
      credit: "Created with ❤️ by",
      authors: [
        { name: "Willian Justen", href: "https://willianjusten.com.br/" },
        { name: "Marcus Silva", href: "https://github.com/mvfsillva" },
        { name: "Bruna Grassi", href: "https://brunagrassi.com.br/" },
      ],
    },
  },
  home: {
    summary: ({ total, live, final }: GamesSummary) =>
      [
        `${total} ${total === 1 ? "game" : "games"}`,
        live > 0 && `${live} live`,
        final > 0 && `${final} final`,
      ]
        .filter(Boolean)
        .join(" · "),
    sidebar: {
      label: "Standings and league leaders",
      loading: "Loading standings and league leaders...",
      topFive: (conferenceAbbreviation: string) =>
        `${conferenceAbbreviation} top 5`,
      allStandings: "All",
      allStandingsLabel: "All standings",
      standingsError: "We couldn't load the standings right now.",
      favorite: "Favorite team",
      leadersTitle: "League leaders",
      categories: {
        points: "Points / game",
        rebounds: "Rebounds / game",
        assists: "Assists / game",
      },
      runnerUp: ({ rank, shortName, displayValue }: SidebarRunnerUp) =>
        `${rank}. ${shortName} ${displayValue}`,
    },
  },
  myTeams: {
    label: "My teams",
    pick: "Pick my teams",
    pickerTitle: "Follow teams",
    follow: (teamName: string) => `Follow ${teamName}`,
    favorite: "Favorite",
    more: (count: number) => `${count} more ${count === 1 ? "team" : "teams"}`,
    loading: "Loading teams...",
    error: "Couldn't load the teams",
    unpersisted: "Favorites won't be saved in this browser.",
  },
  dateRail: {
    label: "Choose a date",
    previousDays: "Show earlier days",
    nextDays: "Show later days",
    gameCount: (count: number) =>
      count === 0 ? "No games" : `${count} ${count === 1 ? "game" : "games"}`,
    dayLabel: (formattedDate: string, countLabel: string | null) =>
      countLabel ? `${formattedDate}, ${countLabel}` : formattedDate,
  },
  gameFilters: {
    heading: "Scoreboard",
    groupLabel: "Filter games",
    all: "All",
    live: "Live",
    final: "Final",
    upcoming: "Upcoming",
    empty: {
      all: (formattedDate: string) => `No games on ${formattedDate}`,
      live: (formattedDate: string) => `No live games on ${formattedDate}`,
      final: (formattedDate: string) => `No final games on ${formattedDate}`,
      upcoming: (formattedDate: string) =>
        `No upcoming games on ${formattedDate}`,
    },
  },
  calendar: {
    pickDate: "Pick date",
    pickDateLabel: "Pick a date",
    openCalendar: "Open calendar",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    weekdays: ["S", "M", "T", "W", "T", "F", "S"],
    dayLabel: (formattedDate: string, hasGames: boolean) =>
      hasGames ? `${formattedDate}, Game day` : formattedDate,
  },
  games: {
    loading: "Loading games...",
    error: "Couldn't load the games",
    errorDetail:
      "The data source didn't respond. This isn't a day without games.",
    retry: "Try again",
    retrying: "Trying again...",
    empty: (formattedDate: string) => `No games on ${formattedDate}`,
    nextGames: (formattedDate: string) => `Next games: ${formattedDate}`,
    stale: (minutesAgo: number) =>
      `Can't reach live data. Showing scores from ${minutesAgo} min ago.`,
    retryingAutomatically: "retrying…",
  },
  gameCard: {
    at: "at",
    winner: "Winner",
    highlights: "Highlights · recap",
    gameDetails: "Game details",
    gamePreview: "Game preview",
    winProbability: "Win probability",
    teamWinProbability: (abbreviation: string, percent: number) =>
      `${abbreviation} ${percent}%`,
    topScorer: "Top scorer",
    points: (points: number) => `${points} PTS`,
  },
  gameStatus: {
    live: "Live",
    postponedShort: "PPD",
    quarter: (period: number) => `Q${period}`,
    overtime: (overtimeNumber: number) =>
      overtimeNumber === 1 ? "OT" : `${overtimeNumber}OT`,
    halftime: "Halftime",
    final: "Final",
    finalAfter: (periodLabel: string) => `Final/${periodLabel}`,
    postponed: "Postponed",
    canceled: "Canceled",
  },
  broadcast: {
    label: "Broadcast: ",
    separator: " · ",
  },
  share: {
    separator: " · ",
    // The brand split for the two-tone wordmark of the default image.
    wordmark: { lead: "Court", accent: "side" },
    pages: { standings: "Standings" },
    finalTitle: (
      awayAbbreviation: string,
      awayScore: number,
      homeScore: number,
      homeAbbreviation: string,
    ) => `${awayAbbreviation} ${awayScore}-${homeScore} ${homeAbbreviation}`,
    finalDescription: (
      awayName: string,
      awayScore: number,
      homeName: string,
      homeScore: number,
    ) => `${awayName} ${awayScore}, ${homeName} ${homeScore}`,
    versus: "VS",
    matchup: (awayLabel: string, homeLabel: string) =>
      `${awayLabel} vs ${homeLabel}`,
  },
  game: {
    title: (awayTeamName: string, homeTeamName: string) =>
      `${awayTeamName} at ${homeTeamName}`,
    loading: "Loading game...",
    error: "We couldn't load this game right now.",
    retry: "Try again",
    retrying: "Trying again...",
    stale: "Game data may be out of date. Retrying automatically.",
    preGameNote: "The game flow and box score appear at tip-off.",
    tabs: {
      label: "Game sections",
      summary: "Summary",
      box: "Box score",
      stats: "Team stats",
      plays: "Plays",
    },
    postponedNote: "This game has been postponed.",
    canceledNote: "This game has been canceled.",
    header: {
      separator: " · ",
      back: (dateLabel: string) => `Back to games on ${dateLabel}`,
      sides: { away: "away", home: "home" },
      seriesLeads: (abbreviation: string, wins: number, losses: number) =>
        `${abbreviation} leads ${wins}-${losses}`,
      seriesWon: (abbreviation: string, wins: number, losses: number) =>
        `${abbreviation} wins ${wins}-${losses}`,
      seriesTied: (wins: number) => `Series tied ${wins}-${wins}`,
    },
    lineScore: {
      title: "Line score",
      team: "Team",
      total: "T",
      notPlayed: "–",
    },
    highlights: {
      title: "Highlights",
      count: (count: number) => `${count} ${count === 1 ? "video" : "videos"}`,
      play: (title: string) => `Play ${title}`,
      videos: "Highlight videos",
      viewMore: "View more",
      viewLess: "View less",
      watchOnEspn: "Watch on ESPN",
    },
    teamStats: {
      title: "Team stats",
      empty: "Team stats fill in once the players check in.",
      percentage: (value: number) => `${value}%`,
      labels: {
        fieldGoalPercentage: "FG%",
        threePointPercentage: "3P%",
        freeThrowPercentage: "FT%",
        rebounds: "Rebounds",
        assists: "Assists",
        turnovers: "Turnovers",
        steals: "Steals",
        blocks: "Blocks",
        pointsInPaint: "Points in paint",
        fastBreakPoints: "Fast break points",
        largestLead: "Largest lead",
      },
    },
    leaders: {
      title: "Game leaders",
      empty: "No leaders yet.",
      athlete: (athleteName: string, teamAbbreviation: string) =>
        `${athleteName} · ${teamAbbreviation}`,
    },
    boxScore: {
      title: "Box score",
      caption: (teamName: string) => `${teamName} box score`,
      teamToggle: "Team",
      empty: "The box score fills in once the players check in.",
      groups: {
        starters: "Starters",
        bench: "Bench",
        didNotPlay: "Did not play",
        yetToPlay: "Yet to play",
      },
      player: "Player",
      totals: "Totals",
      didNotPlayReason: (reason: string) => `DNP - ${reason}`,
      didNotPlayWithoutReason: "DNP",
      columns: {
        minutes: "MIN",
        points: "PTS",
        fieldGoals: "FG",
        threePointers: "3PT",
        freeThrows: "FT",
        rebounds: "REB",
        offensiveRebounds: "OREB",
        defensiveRebounds: "DREB",
        assists: "AST",
        steals: "STL",
        blocks: "BLK",
        turnovers: "TO",
        fouls: "PF",
        plusMinus: "+/-",
      },
    },
    plays: {
      title: "Play-by-play",
      empty: "No plays yet.",
      newestFirst: "Newest first",
      summary: (playCount: number) => `${playCount} plays · newest first`,
      periodFilter: "Period",
      allPeriods: "All",
      showAll: (playCount: number) => `Show all ${playCount} plays`,
      showFewer: "Show fewer plays",
      score: (awayScore: number, homeScore: number) =>
        `${awayScore}-${homeScore}`,
    },
    flow: {
      title: "Game flow",
      empty: "The game flow fills in after the first plays.",
      modeToggle: "Chart",
      modes: { lead: "Lead", winProbability: "Win %" },
      homeLeads: (abbreviation: string, scale: number) =>
        `${abbreviation} leads ↑ +${scale}`,
      awayLeads: (abbreviation: string, scale: number) =>
        `${abbreviation} leads ↓ +${scale}`,
      certain: (abbreviation: string) => `${abbreviation} 100%`,
      marginNow: (abbreviation: string, margin: number) =>
        `${abbreviation} +${margin} now`,
      tiedNow: "Tied now",
      wonBy: (
        abbreviation: string,
        margin: number,
        overtimeLabel: string | null,
      ) =>
        `${abbreviation} won by ${margin}${overtimeLabel ? ` in ${overtimeLabel}` : ""}`,
      toWin: (abbreviation: string, percent: number) =>
        `${abbreviation} ${percent}% to win`,
      winProbability: "Win probability",
      stats: {
        largestLead: "Largest lead",
        leadChanges: "Lead changes",
        timesTied: "Times tied",
        bestRun: "Best run",
      },
      largestLeadValue: (
        awayAbbreviation: string,
        awayLead: number,
        homeAbbreviation: string,
        homeLead: number,
      ) => `${awayAbbreviation} ${awayLead} · ${homeAbbreviation} ${homeLead}`,
      run: (abbreviation: string, points: number, allowedPoints: number) =>
        `${abbreviation} ${points}-${allowedPoints}`,
      runSpan: (fromScore: string, toScore: string) =>
        `${fromScore} to ${toScore}`,
      noRun: "–",
      screenReader: {
        title: "Score margin chart.",
        largestLead: (
          awayTeamName: string,
          awayLead: number,
          homeTeamName: string,
          homeLead: number,
        ) =>
          `Largest lead: ${awayTeamName} ${awayLead}, ${homeTeamName} ${homeLead}.`,
        leadChanges: (count: number) =>
          `${count} ${count === 1 ? "lead change" : "lead changes"}.`,
        leads: (teamName: string, margin: number) =>
          `${teamName} lead by ${margin}.`,
        tied: "The game is tied.",
        wonBy: (teamName: string, margin: number, overtimeCount: number) =>
          `${teamName} won by ${margin}${
            overtimeCount === 0
              ? ""
              : overtimeCount === 1
                ? " in overtime"
                : ` in ${overtimeCount} overtimes`
          }.`,
      },
    },
  },
  standings: {
    title: "Standings",
    // ESPN names the season with a hyphen, e.g. "2026-27"; the design prints it with an en dash.
    season: (seasonName: string) => `SEASON ${seasonName.replace("-", "–")}`,
    conferenceSwitch: "Conference",
    conferenceTable: (conferenceName: string) => `${conferenceName} standings`,
    favorite: "Favorite",
    rowHint: "Select a team to open its page.",
    zones: {
      playoff: {
        legend: "Playoff berth · seeds 1–6",
        rowLabel: "Playoff zone",
      },
      "play-in": {
        legend: "Play-in tournament · seeds 7–10",
        rowLabel: "Play-in zone",
      },
    },
    clinchers: {
      playoffs: { symbol: "x", label: "Clinched playoffs" },
      "play-in": { symbol: "pi", label: "Clinched play-in" },
      eliminated: { symbol: "e", label: "Eliminated" },
    },
    loading: "Loading standings...",
    error: "Couldn't load the standings",
    errorDetail: "The data source didn't respond.",
    stale: "Can't reach the data source. Showing the last standings loaded.",
    preseason: "Standings start with the regular season",
    columns: {
      seed: "#",
      team: "TEAM",
      record: "W–L",
      winPercent: "PCT",
      gamesBehind: "GB",
      home: "HOME",
      road: "ROAD",
      lastTen: "L10",
      streak: "STRK",
      pointDifferential: "DIFF",
    },
    // Read in place of the abbreviated column headers.
    columnNames: {
      seed: "Seed",
      team: "Team",
      record: "Wins and losses",
      winPercent: "Win percentage",
      gamesBehind: "Games behind",
      home: "Home record",
      road: "Road record",
      lastTen: "Last 10 games",
      streak: "Streak",
      pointDifferential: "Point differential",
    },
    noStreak: "-",
    leaderGamesBehind: "-",
    views: {
      label: "View",
      standings: "Standings",
      leaders: "Leaders",
    },
    leaders: {
      title: "League leaders",
      topFive: "Top 5 per category",
      categories: {
        points: "Points per game",
        rebounds: "Rebounds per game",
        assists: "Assists per game",
        steals: "Steals per game",
        blocks: "Blocks per game",
        threesMade: "3-pointers made per game",
        fieldGoalPercentage: "Field goal %",
        freeThrowPercentage: "Free throw %",
      },
      favorite: "Favorite team",
      percentagesHidden:
        "Field goal % and free throw % appear once teams have played 10 games, so tiny samples don't top the list.",
      loading: "Loading league leaders...",
      stale: "Can't reach the data source. Showing the last leaders loaded.",
      preseason: "League leaders start with the regular season",
    },
  },
  leaders: {
    categories: {
      points: { title: "Points" },
      rebounds: { title: "Rebounds" },
      assists: { title: "Assists" },
    },
    empty: "No leaders yet.",
    error: "We couldn't load the league leaders right now.",
    categoryError: "We couldn't load these leaders right now.",
  },
  team: {
    eyebrowSeparator: " · ",
    rank: (ordinalSeed: string, conferenceAbbreviation: string) =>
      `${ordinalSeed} ${conferenceAbbreviation}`,
    tiles: {
      label: "Records",
      home: "Home",
      away: "Away",
      lastTen: "Last 10",
    },
    homeAway: (homeRecord: string, awayRecord: string) =>
      `Home ${homeRecord} · Away ${awayRecord}`,
    follow: "Follow",
    following: "Following",
    loading: "Loading team...",
    error: "Couldn't load this team",
    errorDetail: "The data source didn't respond.",
    stale: "Can't reach the data source. Showing the last team info loaded.",
    tabs: {
      label: "Team sections",
      schedule: "Schedule",
      roster: "Roster",
    },
    schedule: {
      upNext: "Up next",
      results: "Results",
      noResults: "No games played yet.",
      offseason:
        "No upcoming games. The schedule for next season isn't out yet.",
      versus: "vs",
      at: "@",
      next: "Next",
      outcomes: {
        win: { label: "W", accessibleLabel: "Win" },
        loss: { label: "L", accessibleLabel: "Loss" },
      },
      score: (teamScore: number, opponentScore: number) =>
        `${teamScore}-${opponentScore}`,
      showMore: "Show more",
      loading: "Loading schedule...",
      error: "Couldn't load the schedule",
      stale: "Can't reach the data source. Showing the last schedule loaded.",
    },
    playoffs: {
      title: "Playoffs",
      game: (gameNumber: number) => `Game ${gameNumber}`,
    },
    roster: {
      title: "Roster",
      jersey: "#",
      player: "Player",
      position: "Pos",
      age: "Age",
      height: "Ht",
      columnNames: {
        jersey: "Jersey number",
        player: "Player",
        position: "Position",
        age: "Age",
        height: "Height",
      },
      loading: "Loading roster...",
      error: "Couldn't load the roster",
      stale: "Can't reach the data source. Showing the last roster loaded.",
    },
  },
  playoffs: {
    title: "Playoffs",
  },
} as const;
