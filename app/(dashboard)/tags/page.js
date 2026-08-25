import { listTagsOverview } from "@/actions/tags";
import { TagsPanel } from "@/components/tags/tags-panel";

export const metadata = {
  title: "Tags | Graph & Co Drive",
};

export default async function TagsPage() {
  const result = await listTagsOverview();

  return (
    <TagsPanel
      initialTags={result.data || []}
      error={result.success ? null : result.error}
    />
  );
}
