import AppShell from "@/components/AppShell";
import { NAV_ITEMS } from "@/lib/nav";

/** Stand-in for screens built in later phases. */
export default function Placeholder({ href }: { href: string }) {
  const item = NAV_ITEMS.find(n => n.href === href)!;
  return (
    <AppShell title={item.label}>
      <div className="animate-fade-in-up">
        <div className="eyebrow mb-4">Phase {item.phase}</div>
        <h1 className="display text-5xl text-ink mb-6">{item.label}</h1>
        <p className="font-serif italic text-2xl text-smoke">
          This screen arrives in Phase {item.phase}.
        </p>
      </div>
    </AppShell>
  );
}
