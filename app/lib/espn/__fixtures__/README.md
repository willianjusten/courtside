# ESPN fixtures

Real ESPN API responses, trimmed to a few events when too large.

Files ending in `-simulated` are derived from `scoreboard-scheduled-day.json` by replacing the event and competition `status` and the competitor scores with ESPN's in-game shapes (`STATUS_IN_PROGRESS`, `STATUS_HALFTIME`, `STATUS_END_PERIOD`). They stand in until real responses are captured during live games, and should then be replaced.

`leaders-regular-season.json` is the core API leaders response of the 2026-27 season requested with `limit=5`, captured on 2026-10-24 and trimmed to the eight categories the app shows (points, rebounds, assists, steals, blocks, threes made, field goal percentage, and free throw percentage), in ESPN's order. `leaders-athletes.json` maps each of its athlete IDs to that athlete's real core API response.

`summary-pre-game.json`, `summary-live.json`, and `summary-final.json` are real game summaries trimmed of the sections the app does not read (news, videos, odds, injuries, and similar). The final summary keeps its first 40 and last 10 plays, with the matching win probability points. The live summary was captured in the 1st quarter, while ESPN listed its line score under two periods.

`summary-pre-game-tonight.json` (GS at PHX, captured on 2026-10-24 before tip-off), `summary-final-overtime-playoff.json` (LAL at HOU, Game 3 of the 2026 West 1st Round, one overtime), and `summary-final-double-overtime-playoff.json` (SA at OKC, Game 1 of the 2026 West Finals, two overtimes) are real game summaries trimmed to the same sections, keeping every play and win probability point.

`summary-live-simulated.json` stands in for a live capture, since no game was live when the others were captured. It is `summary-final-overtime-playoff.json` cut at the last play of 4:10 in the 3rd quarter: the plays and win probability points after it are dropped, the status is ESPN's `STATUS_IN_PROGRESS` shape, the scores and line score are rebuilt from the plays, and the playoff series is set back to before the game (LAL 2-0). The box score and leaders are removed, since they hold the final totals. It should be replaced by a real live capture.

`summary-final-videos.json` (NY at BOS, captured on 2026-10-24 the morning after the game) is a real game summary trimmed to the header, the game info, and the videos, each video trimmed to its id, headline, description, dates, duration, thumbnail, and its source and web links. It holds the recap followed by the play clips, in ESPN order.

`summary-live-videos-simulated.json` stands in for a live capture with clips, since no game was live when the videos were captured. It is `summary-final-videos.json` set back to halftime: the status is ESPN's `STATUS_HALFTIME` shape, the line score keeps the first two periods, the scores are their sums, and the winner flag is removed. The videos are the clips ESPN had published by the halftime buzzer-beater clip (01:42:56Z), without the recap, which ESPN publishes after the game. It should be replaced by a real live capture.

`scoreboard-international-exhibition.json` is the real 2026-10-12 scoreboard trimmed to the London Lions exhibition, whose competitor has no logo.

`scoreboard-header-week.json` is the real `site.web.api.espn.com` scoreboard header for 2026-10-17 to 2026-10-23, trimmed to the sport, the league, and each event's id, date, name, status, and season.

`standings-season-end.json` is the real regular season standings of the 2025-26 season (`season=2026`), captured on 2026-10-24 after the season ended, without the response's `links`. Every team carries ESPN's clincher stat, covering each code: `*`, `z`, `y`, `x`, `xp`, `pb`, and `e`.
