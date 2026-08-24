"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { mockBuckets } from "@/config/user";
import {
  DEFAULT_BUCKET,
  bucketFromPathname,
  writeBucketCookie,
} from "@/lib/bucket";

const BucketMemoryContext = createContext({
  rememberedSpace: DEFAULT_BUCKET,
  rememberSpace: () => {},
});

export function BucketMemoryProvider({
  initialSpace,
  children,
}) {
  const pathname = usePathname();
  const fromPath = bucketFromPathname(pathname, mockBuckets);
  const [rememberedSpace, setRememberedSpace] = useState(
    () => fromPath?.space || initialSpace || DEFAULT_BUCKET
  );

  useEffect(() => {
    if (!fromPath?.space) return;
    setRememberedSpace(fromPath.space);
    writeBucketCookie(fromPath.space);
  }, [fromPath?.space]);

  const value = useMemo(
    () => ({
      rememberedSpace: fromPath?.space || rememberedSpace,
      rememberSpace(space) {
        if (!space) return;
        setRememberedSpace(space);
        writeBucketCookie(space);
      },
    }),
    [fromPath?.space, rememberedSpace]
  );

  return (
    <BucketMemoryContext.Provider value={value}>
      {children}
    </BucketMemoryContext.Provider>
  );
}

export function useBucketMemory() {
  return useContext(BucketMemoryContext);
}
