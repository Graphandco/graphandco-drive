import { DriveBrowser } from "@/components/drive/drive-browser";

export const metadata = {
   title: "Sans tags | Graph & Photos",
};

export default function UntaggedPage() {
   return <DriveBrowser view="untagged" />;
}
