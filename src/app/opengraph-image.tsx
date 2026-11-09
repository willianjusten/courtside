import {
  renderDefaultImage,
  SHARE_IMAGE_CONTENT_TYPE,
  SHARE_IMAGE_SIZE,
} from "@/lib/share-image/render";
import { INDEFINITE_CACHE_SECONDS } from "@/lib/share-image/share-image";
import { strings } from "@/config/strings";

export const alt = strings.app.name;
export const size = SHARE_IMAGE_SIZE;
export const contentType = SHARE_IMAGE_CONTENT_TYPE;

// Rendered once at build time; it only changes with a deploy.
export default function Image() {
  return renderDefaultImage({ cacheSeconds: INDEFINITE_CACHE_SECONDS });
}
