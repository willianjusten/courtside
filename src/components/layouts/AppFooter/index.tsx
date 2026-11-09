import { Fragment } from "react";
import { strings } from "@/config/strings";

export default function AppFooter() {
  const { credit, authors } = strings.shell.footer;
  return (
    <footer className="relative border-t border-white/8">
      <p className="container mx-auto px-4 py-6 text-xs text-muted">
        {credit}{" "}
        {authors.map((author, index) => (
          <Fragment key={author.href}>
            {index > 0 && ", "}
            <a
              href={author.href}
              target="_blank"
              rel="noreferrer"
              className={`rounded-sm text-secondary underline-offset-2 transition-colors hover:text-foreground hover:underline focus-ring`}
            >
              {author.name}
            </a>
          </Fragment>
        ))}
      </p>
    </footer>
  );
}
