import { DriveBrowser } from "@/components/drive/drive-browser";

export const metadata = {
  title: "Public | Graph & Co Drive",
};

export default async function PublicPage({ searchParams }) {
  const params = await searchParams;
  return (
    <DriveBrowser
      space="public"
      folderId={params?.folder}
      openFileId={params?.file}
      view="browse"
    />
  );
}
