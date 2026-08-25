import { DriveBrowser } from "@/components/drive/drive-browser";

export const metadata = {
  title: "6-MyK | Graph & Co Drive",
};

export default async function SixMykPage({ searchParams }) {
  const params = await searchParams;
  return (
    <DriveBrowser
      space="sixmyk"
      folderId={params?.folder}
      smartFolderId={params?.smart}
      openFileId={params?.file}
      view="browse"
    />
  );
}
