import { cookies } from "next/headers";

import { getSpaceStats, getStorageStats } from "@/actions/files";
import { checkBucketsHealth } from "@/actions/upload";
import { RecentDaysPicker } from "@/components/settings/recent-days-picker";
import { StoragePanel } from "@/components/settings/storage-panel";
import { ThemePicker } from "@/components/settings/theme-picker";
import { readRecentDaysCookie } from "@/lib/recent-settings";

export const metadata = {
   title: "Paramètres | Graph & Photos",
};

export default async function SettingsPage() {
   const cookieStore = await cookies();
   const [stats, buckets, regisStats, publicStats, sixmykStats] =
      await Promise.all([
         getStorageStats(),
         checkBucketsHealth(),
         getSpaceStats("regis"),
         getSpaceStats("public"),
         getSpaceStats("sixmyk"),
      ]);
   const recentDays = readRecentDaysCookie(cookieStore);

   return (
      <div className="mx-auto w-full max-w-5xl space-y-10">
         <div className="space-y-2">
            <h1 className="text-lg font-medium">Paramètres</h1>
            <p className="text-sm text-muted-foreground">
               Apparence, récents et stockage de l’espace Drive.
            </p>
         </div>

         <StoragePanel
            stats={stats}
            buckets={buckets}
            spaceStats={{
               regis: regisStats,
               public: publicStats,
               sixmyk: sixmykStats,
            }}
            error={stats.error}
         />
         <RecentDaysPicker initialDays={recentDays} />
         <ThemePicker />
      </div>
   );
}
