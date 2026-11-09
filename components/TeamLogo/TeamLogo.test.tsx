import { render, screen } from "@testing-library/react";
import TeamLogo from "@/components/TeamLogo";

const LOGO_URL = "https://a.espncdn.com/i/teamlogos/nba/500/bos.png";

function renderedLogo() {
  return screen.getByRole("presentation") as HTMLImageElement;
}

describe("TeamLogo", () => {
  it("requests a single logo at twice its rendered size", () => {
    render(<TeamLogo logoUrl={LOGO_URL} size={28} />);

    const logo = renderedLogo();
    expect(logo.src).toContain("&w=56&h=56");
    expect(logo.getAttribute("srcset")).toBeNull();
  });

  it("lets mobile screens pick a logo at their smaller rendered size", () => {
    render(<TeamLogo logoUrl={LOGO_URL} size={120} mobileSize={72} />);

    const logo = renderedLogo();
    expect(logo.getAttribute("srcset")).toBe(
      "https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/bos.png&w=144&h=144 144w, " +
        "https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/bos.png&w=240&h=240 240w",
    );
    expect(logo.getAttribute("sizes")).toBe("(min-width: 768px) 120px, 72px");
  });

  it("fetches a priority logo ahead of the page's other images", () => {
    render(<TeamLogo logoUrl={LOGO_URL} size={120} priority />);

    expect(renderedLogo().getAttribute("fetchpriority")).toBe("high");
  });
});
