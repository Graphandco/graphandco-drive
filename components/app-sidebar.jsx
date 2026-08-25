"use client";

import { Clock, FolderOpen, Globe, Lock, Tags, Trash2, User } from "lucide-react";

import { BucketSwitcher } from "@/components/bucket-switcher";
import { NavBuckets } from "@/components/nav-buckets";
import { NavMain } from "@/components/nav-main";
import { NavSmartFolders } from "@/components/nav-smart-folders";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { mockBuckets, mockNavMain, mockUser } from "@/config/user";

const iconMap = {
  Lock,
  Globe,
  User,
  Trash2,
  Tags,
  Clock,
  FolderOpen,
};

const buckets = mockBuckets.map((item) => ({
  ...item,
  icon: iconMap[item.icon],
}));

const navMain = mockNavMain.map((item) => ({
  ...item,
  icon: iconMap[item.icon],
}));

export function AppSidebar({ folderTrees, smartFolders = [], ...props }) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/10 bg-transparent"
      {...props}
    >
      <SidebarHeader>
        <BucketSwitcher buckets={buckets} />
      </SidebarHeader>
      <SidebarContent>
        <NavBuckets buckets={buckets} folderTrees={folderTrees} />
        <NavSmartFolders buckets={buckets} smartFolders={smartFolders} />
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={mockUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
