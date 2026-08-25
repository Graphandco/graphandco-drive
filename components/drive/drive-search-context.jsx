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
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DriveSearchContext = createContext(null);

export function DriveSearchProvider({ children }) {
  const [registration, setRegistration] = useState(null);

  const register = useCallback((next) => {
    setRegistration(next);
  }, []);

  const patch = useCallback((partial) => {
    setRegistration((current) =>
      current ? { ...current, ...partial } : current
    );
  }, []);

  const unregister = useCallback(() => {
    setRegistration(null);
  }, []);

  const value = useMemo(
    () => ({ registration, register, patch, unregister }),
    [registration, register, patch, unregister]
  );

  return (
    <DriveSearchContext.Provider value={value}>
      {children}
    </DriveSearchContext.Provider>
  );
}

/** Enregistre la barre de recherche du header depuis une page Drive. */
export function useDriveHeaderSearch({
  enabled = true,
  query,
  setQuery,
  placeholder = "Rechercher…",
}) {
  const ctx = useContext(DriveSearchContext);
  const register = ctx?.register;
  const patch = ctx?.patch;
  const unregister = ctx?.unregister;

  const setQueryRef = useRef(setQuery);
  setQueryRef.current = setQuery;

  const stableSetQuery = useCallback((value) => {
    setQueryRef.current(value);
  }, []);

  useEffect(() => {
    if (!enabled || !register || !unregister) {
      unregister?.();
      return;
    }

    register({
      query,
      setQuery: stableSetQuery,
      placeholder,
    });

    return () => unregister();
    // Mount / enable only — query updates go through patch below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, register, unregister, stableSetQuery]);

  useEffect(() => {
    if (!enabled || !patch) return;
    patch({ query, placeholder });
  }, [enabled, query, placeholder, patch]);
}

export function DriveHeaderSearch() {
  const ctx = useContext(DriveSearchContext);
  const registration = ctx?.registration;
  const inputRef = useRef(null);

  useEffect(() => {
    if (!registration) return;

    function onKeyDown(event) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
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
      inputRef.current?.focus();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [registration]);

  if (!registration) return null;

  const { query, setQuery, placeholder } = registration;
  const hasQuery = String(query || "").trim().length > 0;

  return (
    <div className="relative mr-1 w-full max-w-[14rem] shrink-0 sm:max-w-[16rem] md:max-w-[18rem]">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn("h-8 pl-8 text-sm", hasQuery && "pr-8")}
      />
      {hasQuery ? (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Effacer la recherche"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
