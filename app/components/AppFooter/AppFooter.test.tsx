import { render, screen } from "@testing-library/react";
import { strings } from "@/app/lib/strings";
import AppFooter from ".";

describe("AppFooter", () => {
  it("credits the people who made the app", () => {
    render(<AppFooter />);

    expect(screen.getByRole("contentinfo").textContent).toBe(
      "Created with ❤️ by Willian Justen, Marcus Silva, Bruna Grassi",
    );
  });

  it("links each name to its author's page", () => {
    render(<AppFooter />);

    for (const author of strings.shell.footer.authors) {
      expect(
        screen.getByRole("link", { name: author.name }).getAttribute("href"),
      ).toBe(author.href);
    }
  });
});
