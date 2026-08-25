"use client";

import {
   createContext,
   useCallback,
   useContext,
   useEffect,
   useMemo,
   useRef,
   useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

import { useBucketMemory } from "@/components/bucket-memory";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandInput } from "@/components/ui/command";
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
   buildBrowseSearchUrl,
   readGlobalSearch,
   readSearchQuery,
   resolveDriveSearchContext,
} from "@/lib/drive-search-nav";
import { cn } from "@/lib/utils";

const DriveSearchContext = createContext(null);

export function DriveSearchProvider({ children }) {
   const router = useRouter();
   const pathname = usePathname();
   const searchParams = useSearchParams();
   const { rememberedSpace } = useBucketMemory();

   const browseContext = useMemo(
      () => resolveDriveSearchContext(pathname, searchParams, rememberedSpace),
      [pathname, searchParams, rememberedSpace],
   );

   const urlQuery = browseContext.onBrowsePage
      ? readSearchQuery(searchParams)
      : "";
   const globalFromUrl =
      browseContext.showGlobalToggle && readGlobalSearch(searchParams);

   const [draftQuery, setDraftQuery] = useState(urlQuery);
   const [globalSearch, setGlobalSearchState] = useState(globalFromUrl);
   const [meta, setMeta] = useState({
      resultCount: null,
      searching: false,
      scopeLabel: "",
   });
   const prevUrlQuery = useRef(urlQuery);
   const wasOnBrowsePage = useRef(browseContext.onBrowsePage);
   const globalSearchRef = useRef(globalFromUrl);
   globalSearchRef.current = globalSearch;

   useEffect(() => {
      if (wasOnBrowsePage.current && !browseContext.onBrowsePage) {
         setDraftQuery("");
      }
      wasOnBrowsePage.current = browseContext.onBrowsePage;
   }, [browseContext.onBrowsePage]);

   const browseNavKey = [
      pathname,
      searchParams.get("folder"),
      searchParams.get("smart"),
      searchParams.get("favorites"),
   ].join("|");

   useEffect(() => {
      if (!browseContext.onBrowsePage) return;
      const nextQuery = readSearchQuery(searchParams);
      const nextGlobal = readGlobalSearch(searchParams);
      prevUrlQuery.current = nextQuery;
      setDraftQuery(nextQuery);
      setGlobalSearchState(browseContext.showGlobalToggle ? nextGlobal : false);
   }, [
      browseContext.onBrowsePage,
      browseContext.showGlobalToggle,
      browseNavKey,
      searchParams,
   ]);

   const debouncedQuery = useDebouncedValue(draftQuery, 300);

   const updateBrowseUrl = useCallback(
      (nextQuery, nextGlobalSearch) => {
         if (!browseContext.onBrowsePage) return;
         const href = buildBrowseSearchUrl(pathname, searchParams, {
            q: nextQuery,
            globalSearch: nextGlobalSearch,
            showGlobalToggle: browseContext.showGlobalToggle,
         });
         router.replace(href, { scroll: false });
      },
      [
         browseContext.onBrowsePage,
         browseContext.showGlobalToggle,
         pathname,
         router,
         searchParams,
      ],
   );

   useEffect(() => {
      const trimmed = debouncedQuery.trim();

      if (browseContext.onBrowsePage) {
         if (trimmed === urlQuery) return;
         updateBrowseUrl(trimmed, globalSearchRef.current);
         return;
      }

      if (!trimmed) return;

      router.push(
         `${browseContext.bucketBasePath}?q=${encodeURIComponent(trimmed)}`,
      );
   }, [
      debouncedQuery,
      browseContext.onBrowsePage,
      browseContext.bucketBasePath,
      urlQuery,
      updateBrowseUrl,
      router,
   ]);

   const setQuery = useCallback((value) => {
      setDraftQuery(String(value ?? ""));
   }, []);

   const clearQuery = useCallback(() => {
      setDraftQuery("");
      setGlobalSearchState(false);
      globalSearchRef.current = false;
      prevUrlQuery.current = "";
      if (browseContext.onBrowsePage) {
         updateBrowseUrl("", false);
      }
   }, [browseContext.onBrowsePage, updateBrowseUrl]);

   const setGlobalSearch = useCallback(
      (value) => {
         if (!browseContext.showGlobalToggle) return;
         const nextGlobal = value === true;
         setGlobalSearchState(nextGlobal);
         globalSearchRef.current = nextGlobal;
         updateBrowseUrl(draftQuery.trim(), nextGlobal);
      },
      [browseContext.showGlobalToggle, draftQuery, updateBrowseUrl],
   );

   const placeholder = browseContext.showGlobalToggle
      ? globalSearch
         ? "Rechercher dans tout l'espace…"
         : "Rechercher dans ce dossier…"
      : "Rechercher dans tout l'espace…";

   const value = useMemo(
      () => ({
         query: draftQuery,
         setQuery,
         clearQuery,
         globalSearch,
         setGlobalSearch,
         showGlobalToggle: browseContext.showGlobalToggle,
         placeholder,
         resultCount: meta.resultCount,
         searching: meta.searching,
         scopeLabel: meta.scopeLabel,
         setMeta,
         onBrowsePage: browseContext.onBrowsePage,
      }),
      [
         draftQuery,
         setQuery,
         clearQuery,
         globalSearch,
         setGlobalSearch,
         browseContext.showGlobalToggle,
         browseContext.onBrowsePage,
         placeholder,
         meta.resultCount,
         meta.searching,
         meta.scopeLabel,
      ],
   );

   return (
      <DriveSearchContext.Provider value={value}>
         {children}
      </DriveSearchContext.Provider>
   );
}

export function useDriveSearch() {
   const ctx = useContext(DriveSearchContext);
   if (!ctx) {
      throw new Error("useDriveSearch must be used within DriveSearchProvider");
   }
   return ctx;
}

/** Met à jour le compteur et le libellé depuis une vue Drive. */
export function useDriveSearchMeta({
   resultCount = null,
   searching = false,
   scopeLabel = "",
}) {
   const { setMeta } = useDriveSearch();

   useEffect(() => {
      setMeta({ resultCount, searching, scopeLabel });
   }, [resultCount, searching, scopeLabel, setMeta]);
}

export function DriveHeaderSearch() {
   const {
      query,
      setQuery,
      clearQuery,
      globalSearch,
      setGlobalSearch,
      showGlobalToggle,
      placeholder,
      resultCount,
      searching,
   } = useDriveSearch();

   const [open, setOpen] = useState(false);
   const hasQuery = query.trim().length > 0;

   useEffect(() => {
      function onKeyDown(event) {
         if (
            !(event.metaKey || event.ctrlKey) ||
            event.key.toLowerCase() !== "k"
         ) {
            return;
         }

         const tag = event.target?.tagName;
         if (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            event.target?.isContentEditable
         ) {
            return;
         }

         event.preventDefault();
         setOpen(true);
      }

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
   }, []);

   useEffect(() => {
      if (!open) return;
      const id = window.requestAnimationFrame(() => {
         document.querySelector("[data-slot=command-input]")?.focus();
      });
      return () => window.cancelAnimationFrame(id);
   }, [open]);

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button
               type="button"
               variant="ghost"
               size="icon-sm"
               className={cn(
                  "relative shrink-0 text-muted-foreground hover:text-foreground",
                  open && "bg-sidebar-accent text-sidebar-accent-foreground",
                  hasQuery && !open && "text-primary",
               )}
               aria-label="Rechercher"
               title="Rechercher (⌘K)"
            >
               <Search className="size-4" />
               {hasQuery ? (
                  <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
               ) : null}
            </Button>
         </PopoverTrigger>
         <PopoverContent
            align="end"
            side="bottom"
            sideOffset={8}
            className="w-[min(calc(100vw-2rem),20rem)] border-0 bg-bg-sidebar p-0 text-sidebar-foreground shadow-xl"
            onOpenAutoFocus={(event) => event.preventDefault()}
         >
            <Command shouldFilter={false} className="rounded-lg bg-transparent">
               <CommandInput
                  value={query}
                  onValueChange={setQuery}
                  placeholder={placeholder}
                  aria-label={placeholder}
                  className="text-sidebar-foreground"
               />
            </Command>
            <div className="space-y-2 px-3">
               {showGlobalToggle ? (
                  <label
                     htmlFor="drive-search-global"
                     className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1"
                     onPointerDown={(event) => event.stopPropagation()}
                  >
                     <Checkbox
                        id="drive-search-global"
                        checked={globalSearch}
                        onCheckedChange={(checked) =>
                           setGlobalSearch(checked === true)
                        }
                     />
                     <span className="text-xs font-normal leading-snug text-muted-foreground opacity-60">
                        Recherche globale
                     </span>
                  </label>
               ) : null}

               <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                     {hasQuery ? (
                        searching ? (
                           <>
                              <Loader2 className="size-3 animate-spin" />
                              Recherche…
                           </>
                        ) : resultCount != null ? (
                           <>
                              {resultCount} résultat
                              {resultCount > 1 ? "s" : ""}
                           </>
                        ) : (
                           "Recherche…"
                        )
                     ) : (
                        ""
                     )}
                  </span>
                  {hasQuery ? (
                     <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={clearQuery}
                        className="h-6 px-2 text-muted-foreground hover:text-foreground"
                     >
                        <X className="size-3" />
                        Effacer
                     </Button>
                  ) : null}
               </div>
            </div>
         </PopoverContent>
      </Popover>
   );
}
