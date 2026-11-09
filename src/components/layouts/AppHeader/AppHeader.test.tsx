import { render, screen } from "@testing-library/react";
import { strings } from "@/config/strings";
import AppHeader from "@/components/layouts/AppHeader";

describe("AppHeader", () => {
  it("links the NBA logo to the home page", () => {
    render(<AppHeader navigation={null} myTeams={null} />);

    const logoLink = screen.getByRole("link", {
      name: strings.shell.logoLabel,
    });
    expect(logoLink.getAttribute("href")).toBe("/");
    expect(logoLink.querySelector("img")?.getAttribute("src")).toContain(
      "/i/teamlogos/leagues/500/nba.png",
    );
  });
});
