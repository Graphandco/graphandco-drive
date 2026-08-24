"use client";

import { motion } from "motion/react";

import { useTheme } from "@/components/theme-provider";
import { springSnappy } from "@/lib/motion";
import { THEMES } from "@/lib/theme";
import { cn } from "@/lib/utils";

function ThemePreview({ themeId }) {
   if (themeId === "aurora") {
      return (
         <div
            className="relative h-16 overflow-hidden rounded-md"
            style={{ backgroundColor: "#100e0b" }}
            aria-hidden="true"
         >
            <div
               className="absolute inset-0"
               style={{
                  background:
                     "radial-gradient(55.8% 55.49% at 50% 100%, rgb(38, 77, 76) 0%, rgba(25, 48, 47, 0) 100%)",
                  mixBlendMode: "screen",
               }}
            />
            <div
               className="absolute inset-0 opacity-90"
               style={{
                  background:
                     "repeating-linear-gradient(100deg, #9ca3af 0%, #6b7280 4%, transparent 10%), repeating-linear-gradient(100deg, #262626 0%, transparent 12%)",
                  backgroundSize: "200% 200%",
                  mixBlendMode: "screen",
                  filter: "blur(14px)",
               }}
            />
            <div
               className="absolute inset-0"
               style={{
                  background:
                     "radial-gradient(ellipse at 100% 100%, #ffffff 20%, #0a0a0a 80%)",
                  mixBlendMode: "multiply",
                  opacity: 0.85,
               }}
            />
         </div>
      );
   }

   if (themeId === "smokeveil") {
      return (
         <div
            className="relative h-16 overflow-hidden rounded-md"
            style={{ backgroundColor: "#100e0b" }}
            aria-hidden="true"
         >
            <div
               className="absolute inset-0"
               style={{
                  background:
                     "linear-gradient(155deg, transparent 8%, rgba(45, 53, 113, 0.45) 43%, transparent 82%)",
                  mixBlendMode: "screen",
                  filter: "blur(18px)",
               }}
            />
            <div
               className="absolute inset-0 opacity-90"
               style={{
                  background:
                     "radial-gradient(70% 50% at 45% 50%, rgba(53, 41, 112, 0.45) 0%, transparent 75%)",
                  mixBlendMode: "screen",
                  filter: "blur(16px)",
               }}
            />
            <div
               className="absolute inset-0 opacity-80"
               style={{
                  background:
                     "linear-gradient(25deg, transparent 25%, rgba(90, 94, 150, 0.25) 50%, transparent 75%)",
                  mixBlendMode: "soft-light",
                  filter: "blur(12px)",
               }}
            />
         </div>
      );
   }

   if (themeId === "bloodmoon") {
      return (
         <div
            className="relative h-16 overflow-hidden rounded-md"
            style={{ backgroundColor: "#100e0b" }}
            aria-hidden="true"
         >
            <div
               className="absolute inset-0"
               style={{
                  background:
                     "radial-gradient(ellipse 48% 52% at 40% 45%, rgba(220,38,38,0.9) 0%, transparent 60%)",
                  mixBlendMode: "screen",
                  filter: "blur(18px)",
               }}
            />
            <div
               className="absolute inset-0"
               style={{
                  background:
                     "radial-gradient(ellipse 35% 40% at 70% 35%, rgba(153,27,27,0.7) 0%, transparent 65%)",
                  mixBlendMode: "screen",
                  filter: "blur(16px)",
               }}
            />
            <div
               className="absolute inset-0"
               style={{
                  background:
                     "radial-gradient(ellipse 30% 35% at 25% 70%, rgba(239,68,68,0.5) 0%, transparent 55%)",
                  mixBlendMode: "screen",
                  filter: "blur(14px)",
               }}
            />
         </div>
      );
   }

   if (themeId === "steelspectrum") {
      return (
         <div
            className="relative h-16 overflow-hidden rounded-md"
            style={{ backgroundColor: "#100e0b" }}
            aria-hidden="true"
         >
            <div
               className="absolute inset-0"
               style={{
                  background:
                     "conic-gradient(from 200deg at 50% 55%, #334155, #64748b, #94a3b8, #475569, #1e293b, #334155)",
                  mixBlendMode: "screen",
                  filter: "blur(18px)",
               }}
            />
            <div
               className="absolute inset-0"
               style={{
                  background:
                     "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.5) 0%, transparent 50%)",
                  mixBlendMode: "multiply",
                  filter: "blur(10px)",
               }}
            />
         </div>
      );
   }

   return (
      <div
         className="relative h-16 overflow-hidden rounded-md"
         style={{ backgroundColor: "#100e0b" }}
         aria-hidden="true"
      >
         <div
            className="absolute inset-0"
            style={{
               background:
                  "linear-gradient(154deg, transparent 28%, rgba(48,137,130,0.35) 48%, transparent 68%)",
               mixBlendMode: "screen",
               filter: "blur(20px)",
            }}
         />
         <div
            className="absolute inset-0"
            style={{
               background:
                  "radial-gradient(ellipse 70% 40% at 50% 55%, rgba(38,116,111,0.35) 0%, transparent 75%)",
               mixBlendMode: "screen",
               filter: "blur(16px)",
            }}
         />
      </div>
   );
}

export function ThemePicker() {
   const { theme, setTheme } = useTheme();

   return (
      <div className="space-y-3">
         <div>
            <h2 className="text-sm font-medium">Thème</h2>
            {/* <p className="mt-1 text-sm text-muted-foreground">
          Change le fond et les couleurs d’accent. Appliqué immédiatement.
        </p> */}
         </div>

         <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {THEMES.map((item, index) => {
               const selected = theme === item.id;
               return (
                  <motion.button
                     key={item.id}
                     type="button"
                     onClick={() => setTheme(item.id)}
                     aria-pressed={selected}
                     initial={{ opacity: 0, y: 8 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ ...springSnappy, delay: index * 0.04 }}
                     whileHover={{ y: -2 }}
                     whileTap={{ scale: 0.98 }}
                     className={cn(
                        "rounded-xl border p-3 text-left",
                        selected
                           ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                           : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30",
                     )}
                  >
                     <ThemePreview themeId={item.id} />
                     <p className="mt-2.5 text-sm font-medium">{item.name}</p>
                     <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.description}
                     </p>
                  </motion.button>
               );
            })}
         </div>
      </div>
   );
}
