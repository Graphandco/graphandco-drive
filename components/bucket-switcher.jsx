"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";

import { useActiveBucket } from "@/hooks/use-active-bucket";
import { useBucketMemory } from "@/components/bucket-memory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function BucketSwitcher({ buckets = [] }) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { active } = useActiveBucket(buckets);
  const { rememberSpace } = useBucketMemory();

  if (!active) return null;

  const ActiveIcon = active.icon;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {ActiveIcon ? <ActiveIcon className="size-4" /> : null}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{active.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {active.description || "Bucket"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Buckets
            </DropdownMenuLabel>
            {buckets.map((bucket) => {
              const Icon = bucket.icon;
              const selected = active.space === bucket.space;

              return (
                <DropdownMenuItem
                  key={bucket.space || bucket.url}
                  className={cn("gap-2 p-2", selected && "bg-accent")}
                  onClick={() => {
                    rememberSpace(bucket.space);
                    router.push(bucket.url);
                  }}
                >
                  <div className="flex size-6 items-center justify-center rounded-md bg-white/5">
                    {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
                  </div>
                  <div className="grid flex-1 leading-tight">
                    <span className="truncate text-sm font-medium">
                      {bucket.name}
                    </span>
                    {bucket.description ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {bucket.description}
                      </span>
                    ) : null}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
