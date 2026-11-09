import { renderGameShareImage } from "@/features/game/share-image";
import { loadShareView } from "@/features/game/share-view.server";
import {
  SHARE_IMAGE_CONTENT_TYPE,
  SHARE_IMAGE_SIZE,
} from "@/lib/share-image/render";
import { strings } from "@/lib/strings";

// The image follows the game's live status, so it renders on every request; caching is left to Cache-Control.
export const dynamic = "force-dynamic";

// generateImageMetadata, rather than a static alt export, lets the alt text name the game; it needs an id for the one image.
export async function generateImageMetadata({
  params,
}: {
  params: { id: string };
}) {
  const shareView = await loadShareView(params.id);
  return [
    {
      id: "preview",
      alt:
        shareView.variant === "fallback" ? strings.app.name : shareView.title,
      size: SHARE_IMAGE_SIZE,
      contentType: SHARE_IMAGE_CONTENT_TYPE,
    },
  ];
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return renderGameShareImage((await params).id);
}
