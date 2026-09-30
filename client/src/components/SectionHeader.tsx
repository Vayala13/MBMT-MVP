/**
 * Section header — Aare-turquoise numeral + label, oversized light title, quiet aside.
 */
export default function SectionHeader({
  index,
  label,
  title,
  aside,
}: {
  index: string;
  label: string;
  title: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20 lg:mb-28">
      <div className="lg:col-span-3 flex items-baseline gap-4">
        <span className="text-5xl font-medium tabular-nums tracking-tight text-aare leading-none">
          {index}
        </span>
        <span className="eyebrow">{label}</span>
      </div>
      <div className="lg:col-span-6">
        <h2 className="display text-5xl md:text-7xl text-ink">{title}</h2>
      </div>
      {aside && (
        <p className="lg:col-span-3 text-sm leading-relaxed text-smoke lg:pt-3">
          {aside}
        </p>
      )}
    </div>
  );
}
