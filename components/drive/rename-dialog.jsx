"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function RenameDialog({
  open,
  onOpenChange,
  item,
  pending: pendingProp = false,
  onConfirm,
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pendingLocal, startTransition] = useTransition();
  const pending = pendingProp || pendingLocal;

  const kindLabel = item?.kind === "folder" ? "dossier" : "fichier";

  useEffect(() => {
    if (open && item) {
      setName(item.name || "");
      setError("");
    }
  }, [open, item]);

  function handleSubmit(event) {
    event.preventDefault();
    const next = name.trim();
    if (!next) {
      setError("Le nom est requis.");
      return;
    }
    if (item && next === item.name) {
      onOpenChange?.(false);
      return;
    }

    startTransition(async () => {
      setError("");
      const result = await onConfirm?.(next);
      if (result === false) return;
      if (result && result.success === false) {
        setError(result.error || "Renommage impossible.");
        return;
      }
      onOpenChange?.(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange?.(next);
      }}
    >
      <DialogContent className="border-white/10 bg-[#161310] text-white sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Renommer le {kindLabel}</DialogTitle>
            <DialogDescription className="text-white/60">
              Choisissez un nouveau nom pour « {item?.name} ».
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <Input
              value={name}
              disabled={pending}
              autoFocus
              placeholder="Nouveau nom"
              className="border-white/15 bg-black/30 text-white"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && !pending) {
                  onOpenChange?.(false);
                }
              }}
            />
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              className="text-white/70 hover:text-white"
              onClick={() => onOpenChange?.(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Renommer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
