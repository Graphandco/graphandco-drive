"use client";

import { usePathname } from "next/navigation";

import { useBucketMemory } from "@/components/bucket-memory";
import {
  bucketFromPathname,
  resolveBucket,
} from "@/lib/bucket";

export function useActiveBucket(buckets = []) {
  const pathname = usePathname();
  const { rememberedSpace } = useBucketMemory();
  const fromPath = bucketFromPathname(pathname, buckets);
  const active = resolveBucket(buckets, pathname, rememberedSpace);
  const onDrive = Boolean(fromPath);

  return { active, onDrive, fromPath };
}
