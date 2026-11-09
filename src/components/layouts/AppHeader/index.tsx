import type { ReactNode } from "react";
import Link from "next/link";
import { NBA_LOGO_URL, resizedLogoUrl } from "@/lib/espn/logos";
import { strings } from "@/config/strings";

const LOGO_DISPLAY_SIZE = 48;
// Requested at twice the display size so the logo stays sharp on high-density screens.
const LOGO_REQUEST_SIZE = LOGO_DISPLAY_SIZE * 2;

type AppHeaderProps = {
  navigation: ReactNode;
  myTeams: ReactNode;
};

// The layout passes the navigation and the followed teams in, so this shared component never imports a feature.
export default function AppHeader({ navigation, myTeams }: AppHeaderProps) {
  return (
    <header className="relative border-b border-white/8">
      <div className="container mx-auto flex items-center gap-6 px-4 py-3 md:py-5">
        <Link
          href="/"
          aria-label={strings.shell.logoLabel}
          className="flex min-h-11 items-center gap-2.5 md:gap-3"
        >
          <img
            src={resizedLogoUrl(NBA_LOGO_URL, LOGO_REQUEST_SIZE)}
            alt=""
            width={LOGO_DISPLAY_SIZE}
            height={LOGO_DISPLAY_SIZE}
            // ESPN pads the narrow logo into a square, so the image is cropped to the logo's width to keep it close to the wordmark.
            className="h-10 w-5 object-cover md:h-12 md:w-6"
          />
          {/* Bebas Neue sits high in its line box, so it is nudged down to center its caps on the logo. */}
          <span className="translate-y-0.5 font-display text-[28px] leading-none md:text-4xl">
            {strings.app.wordmark.lead}
            <span className="text-accent">{strings.app.wordmark.accent}</span>
          </span>
        </Link>
        {navigation}
        <div className="ml-auto min-w-0">{myTeams}</div>
      </div>
    </header>
  );
}
