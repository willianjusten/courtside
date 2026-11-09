export const NBA_LOGO_URL =
  "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png";

const ESPN_IMAGE_RESIZER = "https://a.espncdn.com/combiner/i";

// The ESPN CDN resizes images server-side, so the app ships small PNGs without Next image optimization.
export function resizedImageUrl(
  imageUrl: string,
  width: number,
  height: number,
) {
  const imagePath = new URL(imageUrl).pathname;
  return `${ESPN_IMAGE_RESIZER}?img=${imagePath}&w=${width}&h=${height}`;
}

// Requested at twice the display size so headshots stay sharp on high-density screens.
const HEADSHOT_REQUEST_SCALE = 2;

export function resizedHeadshotUrl(
  headshotUrl: string,
  displayWidth: number,
  displayHeight: number,
) {
  return resizedImageUrl(
    headshotUrl,
    displayWidth * HEADSHOT_REQUEST_SCALE,
    displayHeight * HEADSHOT_REQUEST_SCALE,
  );
}

export function resizedLogoUrl(logoUrl: string, size: number) {
  return resizedImageUrl(logoUrl, size, size);
}
