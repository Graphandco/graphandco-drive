import { DriveBrowser } from "@/components/drive/drive-browser";

export const metadata = {
  title: "Régis | Graph & Co Drive",
};

export default async function RegisPage({ searchParams }) {
  const params = await searchParams;
  return (
    <DriveBrowser
      space="regis"
      folderId={params?.folder}
      openFileId={params?.file}
      view="browse"
    />
  );
}
