"use client";

import { useCallback, useState, useTransition } from "react";

/**
 * useTransition ne reste pas pending pendant les await async —
 * on combine avec un flag explicite pour les actions longues (S3, etc.).
 */
export function useBusyAction() {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const isBusy = pending || busy;

  const runBusy = useCallback(async (action) => {
    setBusy(true);
    try {
      return await action();
    } finally {
      setBusy(false);
    }
  }, []);

  return { isBusy, pending, busy, startTransition, runBusy, setBusy };
}
