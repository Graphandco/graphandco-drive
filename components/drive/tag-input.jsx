"use client";

import { useEffect, useId, useState } from "react";

import { listActiveTags } from "@/actions";
import { Input } from "@/components/ui/input";

export function TagInput({ space, value, onChange, disabled, ...props }) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!space) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;

    listActiveTags({ space }).then((result) => {
      if (cancelled) return;
      setSuggestions(result.success ? result.data || [] : []);
    });

    return () => {
      cancelled = true;
    };
  }, [space]);

  return (
    <>
      <Input
        value={value}
        onChange={onChange}
        disabled={disabled}
        list={listId}
        {...props}
      />
      <datalist id={listId}>
        {suggestions.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </>
  );
}
