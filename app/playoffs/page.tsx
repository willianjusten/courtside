import PagePlaceholder from "@/components/PagePlaceholder";
import { Hydrate } from "@/lib/query/server";
import { strings } from "@/lib/strings";

export default function PlayoffsPage() {
  return (
    <Hydrate>
      <PagePlaceholder title={strings.playoffs.title} />
    </Hydrate>
  );
}
