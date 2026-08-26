import { DriveBrowser } from "@/components/drive/drive-browser";

export const metadata = {
   title: "Régis | Graph & Photos",
};

export default async function RegisPage({ searchParams }) {
   const params = await searchParams;
   return (
      <DriveBrowser
         space="regis"
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
