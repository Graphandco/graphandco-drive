import { DriveBrowser } from "@/components/drive/drive-browser";

export const metadata = {
  title: "Sans tags | Graph & Co Drive",
};

export default function UntaggedPage() {
  return <DriveBrowser view="untagged" />;
}
