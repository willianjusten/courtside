import "server-only";
import { loadStandings } from "@/lib/server/loaders";
import { standingsQueryOptions } from "./standings";

export const standingsServerQuery = () => ({
  ...standingsQueryOptions(),
  queryFn: loadStandings,
});
