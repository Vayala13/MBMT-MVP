import {
  CalendarDays,
  FolderOpen,
  LayoutDashboard,
  ListTodo,
  ListChecks,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@shared/enums";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only these roles see the link. Omitted = everyone. */
  roles?: UserRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: ListTodo },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/cases", label: "Cases", icon: FolderOpen },
  { href: "/templates", label: "Templates", icon: ListChecks },
  {
    href: "/permissions",
    label: "App permissions",
    icon: ShieldCheck,
    roles: ["admin"],
  },
];
