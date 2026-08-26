import { DriveBrowser } from "@/components/drive/drive-browser";

export const metadata = {
   title: "Public | Graph & Photos",
};

export default async function PublicPage({ searchParams }) {
   const params = await searchParams;
   return (
      <DriveBrowser
         space="public"
         folderId={params?.folder}
         smartFolderId={params?.smart}
         favoritesMode={
            params?.favorites === "1" || params?.favorites === "true"
         }
         openFileId={params?.file}
         view="browse"
      />
   );
}
