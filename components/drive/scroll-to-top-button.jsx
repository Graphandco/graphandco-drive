"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SHOW_AFTER_PX = 1000;

function getScrollParent() {
  if (typeof document === "undefined") return null;
  const inset = document.querySelector('[data-slot="sidebar-inset"]');
  if (inset && inset.scrollHeight > inset.clientHeight + 1) {
    return inset;
  }
  return document.scrollingElement || document.documentElement;
}

function readScrollTop(target) {
  if (!target) return 0;
  if (target === document.scrollingElement || target === document.documentElement) {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
  return target.scrollTop || 0;
}

export function ScrollToTopButton({ threshold = SHOW_AFTER_PX, className }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = getScrollParent();
    if (!target) return;

    function onScroll() {
      setVisible(readScrollTop(target) >= threshold);
    }

    onScroll();
    const opts = { passive: true };
    if (target === document.scrollingElement || target === document.documentElement) {
      window.addEventListener("scroll", onScroll, opts);
      return () => window.removeEventListener("scroll", onScroll);
    }

    target.addEventListener("scroll", onScroll, opts);
    return () => target.removeEventListener("scroll", onScroll);
  }, [threshold]);

  function onClick() {
    const target = getScrollParent();
    if (!target) return;
    if (target === document.scrollingElement || target === document.documentElement) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    target.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label="Remonter en haut"
      onClick={onClick}
      className={cn(
        "fixed right-5 bottom-5 z-40 size-11 rounded-full border-white/20 bg-black/70 text-white shadow-lg backdrop-blur-md transition-opacity hover:bg-black/85 hover:text-white",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
        className
      )}
    >
      <ArrowUp className="size-5" />
    </Button>
  );
}
