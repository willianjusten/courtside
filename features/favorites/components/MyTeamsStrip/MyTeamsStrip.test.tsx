import { QueryClientProvider } from "@tanstack/react-query";
import { withApiRoutes } from "@/test-utils/api-routes";
import { fireEvent, render, screen, within } from "@testing-library/react";
import teamsList from "@/lib/espn/__fixtures__/teams-list.json";
import { favoritesStore } from "@/features/favorites/use-favorite-team-ids";
import { makeQueryClient } from "@/lib/query/make-query-client";
import { strings } from "@/lib/strings";
import MyTeamsStrip from "@/features/favorites/components/MyTeamsStrip";

function renderMyTeamsStrip() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MyTeamsStrip />
    </QueryClientProvider>,
  );
}

function followTeams(teamIds: string[]) {
  teamIds.forEach((teamId) => favoritesStore().toggle(teamId));
}

beforeEach(() => {
  favoritesStore().list().forEach(favoritesStore().remove);
  vi.stubGlobal(
    "fetch",
    withApiRoutes(() => Response.json(teamsList)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MyTeamsStrip", () => {
  it("shows every followed team when there are three or fewer", async () => {
    followTeams(["1", "2", "17"]);
    renderMyTeamsStrip();

    expect(
      await screen.findByRole("link", { name: "Brooklyn Nets" }),
    ).toBeDefined();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /more team/ })).toBeNull();
  });

  it("collapses the teams past the third into a +N chip that lists them", async () => {
    followTeams(["1", "2", "17", "30", "4"]);
    renderMyTeamsStrip();

    const moreTeams = await screen.findByRole("button", {
      name: strings.myTeams.more(2),
    });
    expect(moreTeams.textContent).toBe("+2");
    expect(screen.getAllByRole("link")).toHaveLength(3);

    fireEvent.click(moreTeams);
    const overflowList = await screen.findByRole("dialog", {
      name: strings.myTeams.more(2),
    });
    expect(
      within(overflowList)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Charlotte Hornets", "Chicago Bulls"]);
  });
});
