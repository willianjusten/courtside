import PagePlaceholder from "@/components/ui/PagePlaceholder";
import { Hydrate } from "@/lib/react-query/server";
import { strings } from "@/config/strings";

export default function PlayoffsPage() {
  return (
    <Hydrate>
      <PagePlaceholder title={strings.playoffs.title} />
    </Hydrate>
  );
}
