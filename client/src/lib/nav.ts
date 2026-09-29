import {
  CalendarDays,
  FolderOpen,
  LayoutDashboard,
  ListTodo,
  ListChecks,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: ListTodo },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/cases", label: "Cases", icon: FolderOpen },
  { href: "/templates", label: "Templates", icon: ListChecks },
  { href: "/team", label: "Team & Access", icon: ShieldCheck },
];
