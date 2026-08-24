import { ThemePicker } from "@/components/settings/theme-picker";

export const metadata = {
   title: "Paramètres | Graph & Co Drive",
};

export default function SettingsPage() {
   return (
      <div className="max-w-3xl space-y-8">
         <div className="space-y-2">
            <h1 className="text-lg font-medium">Paramètres</h1>
            <p className="text-sm text-muted-foreground">
               Configuration générale de l’espace Drive.
            </p>
         </div>

         <ThemePicker />
      </div>
   );
}
