import { renderStandingsShareImage } from "@/features/standings/share-image";
import { loadStandingsShareView } from "@/features/standings/share-view.server";
import {
  SHARE_IMAGE_CONTENT_TYPE,
  SHARE_IMAGE_SIZE,
} from "@/lib/share-image/render";
import { strings } from "@/lib/strings";

// Standings move after every game, so the image renders on every request; caching is left to Cache-Control.
export const dynamic = "force-dynamic";

// generateImageMetadata, rather than a static alt export, lets the alt text name the season; it needs an id for the one image.
export async function generateImageMetadata() {
  const shareView = await loadStandingsShareView();
  return [
    {
      id: "preview",
      alt: shareView.variant === "fallback" ? strings.app.name : shareView.alt,
      size: SHARE_IMAGE_SIZE,
      contentType: SHARE_IMAGE_CONTENT_TYPE,
    },
  ];
}

export default function Image() {
  return renderStandingsShareImage();
}
