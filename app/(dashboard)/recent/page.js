import { cookies } from "next/headers";

import { DriveBrowser } from "@/components/drive/drive-browser";
import { readRecentDaysCookie } from "@/lib/recent-settings";

export const metadata = {
   title: "Fichiers récents | Graph & Photos",
};

export default async function RecentPage() {
   const cookieStore = await cookies();
   const recentDays = readRecentDaysCookie(cookieStore);

   return <DriveBrowser view="recent" recentDays={recentDays} />;
}
