import { vi } from "vitest";
import React from "react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => React.createElement("img", props),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("server-only", () => ({}));

// The server's memory cache outlives a test, and tests answer ESPN differently.
afterEach(async () => {
  const { clearMemoryCache } = await import("@/app/lib/server/memory-cache");
  clearMemoryCache();
});
