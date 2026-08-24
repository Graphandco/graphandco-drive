import { getStorageStats } from "@/actions/files";
import { checkBucketsHealth } from "@/actions/upload";
import { StoragePanel } from "@/components/settings/storage-panel";
import { ThemePicker } from "@/components/settings/theme-picker";

export const metadata = {
   title: "Paramètres | Graph & Co Drive",
};

export default async function SettingsPage() {
   const [stats, buckets] = await Promise.all([
      getStorageStats(),
      checkBucketsHealth(),
   ]);

   return (
      <div className="max-w-3xl space-y-10">
         <div className="space-y-2">
            <h1 className="text-lg font-medium">Paramètres</h1>
            <p className="text-sm text-muted-foreground">
               Apparence et stockage de l’espace Drive.
            </p>
         </div>

         <StoragePanel stats={stats} buckets={buckets} error={stats.error} />
         <ThemePicker />
      </div>
   );
}
