import type { ReactNode } from "react";
import { SURFACE_CLASS_NAME } from "./styles";

export function Section({
  headingId,
  title,
  action,
  children,
}: {
  headingId: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const heading = (
    <h2
      id={headingId}
      className="font-display text-base tracking-[0.18em] text-muted uppercase md:text-lg"
    >
      {title}
    </h2>
  );

  return (
    <section
      aria-labelledby={headingId}
      className={`flex min-w-0 flex-col gap-3 p-3.5 md:p-[18px] ${SURFACE_CLASS_NAME}`}
    >
      {action ? (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {heading}
          {action}
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  );
}
