import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { makeQueryClient } from "@/lib/query/make-query-client";
import { strings } from "@/lib/strings";
import AppHeader from "@/features/shell/components/AppHeader";

// The navigation is an async server component, covered by its own tests.
vi.mock("@/features/shell/components/PrimaryNavigation", () => ({
  default: () => null,
  PrimaryNavigationFallback: () => null,
}));

describe("AppHeader", () => {
  it("links the NBA logo to the home page", () => {
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <AppHeader />
      </QueryClientProvider>,
    );

    const logoLink = screen.getByRole("link", {
      name: strings.shell.logoLabel,
    });
    expect(logoLink.getAttribute("href")).toBe("/");
    expect(logoLink.querySelector("img")?.getAttribute("src")).toContain(
      "/i/teamlogos/leagues/500/nba.png",
    );
  });
});
