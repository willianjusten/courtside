// ESPN event ids are numeric.
const GAME_ID_PATTERN = /^\d+$/;

export function isGameId(id: string) {
  return GAME_ID_PATTERN.test(id);
}
