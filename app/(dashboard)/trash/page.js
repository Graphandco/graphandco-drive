import { DriveBrowser } from "@/components/drive/drive-browser";

export const metadata = {
  title: "Corbeille | Graph & Co Drive",
};

export default function TrashPage() {
  return <DriveBrowser view="trash" />;
}
