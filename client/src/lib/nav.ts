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
  phase: number;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, phase: 2 },
  { href: "/today", label: "Today", icon: ListTodo, phase: 4 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, phase: 5 },
  { href: "/cases", label: "Cases", icon: FolderOpen, phase: 3 },
  { href: "/templates", label: "Templates", icon: ListChecks, phase: 4 },
  { href: "/team", label: "Team & Access", icon: ShieldCheck, phase: 5 },
];
