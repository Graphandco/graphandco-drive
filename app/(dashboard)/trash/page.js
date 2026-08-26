import { DriveBrowser } from "@/components/drive/drive-browser";

export const metadata = {
   title: "Corbeille | Graph & Photos",
};

export default function TrashPage() {
   return <DriveBrowser view="trash" />;
}
