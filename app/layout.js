import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";

import { AuraBackground } from "@/components/ui/aura-background";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { readThemeCookie } from "@/lib/theme";

import "./globals.css";

const geistSans = Geist({
   variable: "--font-geist-sans",
   subsets: ["latin"],
});

const geistMono = Geist_Mono({
   variable: "--font-geist-mono",
   subsets: ["latin"],
});

export const metadata = {
   title: "Graph & Photos",
   description: "Espace de fichiers Graph & Co",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }) {
   const cookieStore = await cookies();
   const theme = readThemeCookie(cookieStore);

   return (
      <html
         lang="fr"
         data-theme={theme}
         className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      >
         <body className="min-h-full" suppressHydrationWarning>
            <ThemeProvider initialTheme={theme}>
               <TooltipProvider>
                  <AuraBackground>
                     {children}
                     <Toaster />
                  </AuraBackground>
               </TooltipProvider>
            </ThemeProvider>
         </body>
      </html>
   );
}
