import { FlaskConical } from "lucide-react";

export const BANNER_HEIGHT = "2.25rem";

/** Persistent on every screen, including the gate. */
export default function DemoBanner() {
  return (
    <div
      role="note"
      className="fixed inset-x-0 bottom-0 z-40 h-9 bg-navy border-t border-plaster/15 flex items-center justify-center gap-2.5 text-[0.68rem] tracking-[0.22em] uppercase text-gold"
    >
      <FlaskConical className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
      Prototype — demo data only
    </div>
  );
}
