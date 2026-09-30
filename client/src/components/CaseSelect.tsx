import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Case } from "@shared/types";

/** Case picker grouped Active / Intake / Referred out (closed cases hidden). */
export default function CaseSelect({
  id,
  cases,
  value,
  onChange,
}: {
  id: string;
  cases: Case[];
  value: string;
  onChange: (v: string) => void;
}) {
  const open = cases
    .filter(c => c.status !== "closed")
    .sort((a, b) => a.caption.localeCompare(b.caption));
  const groups = [
    { label: "Active", rows: open.filter(c => c.status === "active") },
    {
      label: "Intake",
      rows: open.filter(c => c.status === "inquiry" || c.status === "consult"),
    },
    {
      label: "Referred out",
      rows: open.filter(c => c.status === "referred_out"),
    },
  ];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full mt-2 bg-plaster">
        <SelectValue placeholder="Choose a case" />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {groups
          .filter(g => g.rows.length)
          .map(g => (
            <SelectGroup key={g.label}>
              <SelectLabel className="eyebrow">{g.label}</SelectLabel>
              {g.rows.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.caption}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
      </SelectContent>
    </Select>
  );
}
