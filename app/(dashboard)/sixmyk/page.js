import { DriveBrowser } from "@/components/drive/drive-browser";

export const metadata = {
  title: "Six-MyK | Graph & Co Drive",
};

export default async function SixMykPage({ searchParams }) {
  const params = await searchParams;
  return (
    <DriveBrowser
      space="sixmyk"
      folderId={params?.folder}
      openFileId={params?.file}
      view="browse"
    />
  );
}
