import { DriveBrowser } from "@/components/drive/drive-browser";

export const metadata = {
   title: "Sans dossier | Graph & Photos",
};

export default function OrphansPage() {
   return <DriveBrowser view="orphans" />;
}
