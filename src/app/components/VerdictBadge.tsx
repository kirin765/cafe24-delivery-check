import type { Verdict } from "@/features/checks/types";

const STYLES: Record<Verdict, string> = {
  configured: "bg-green-100 text-green-800 border-green-200",
  missing: "bg-red-100 text-red-800 border-red-200",
  disabled: "bg-amber-100 text-amber-800 border-amber-200",
  ambiguous: "bg-orange-100 text-orange-800 border-orange-200",
  unknown: "bg-slate-100 text-slate-700 border-slate-200",
  not_applicable: "bg-gray-100 text-gray-500 border-gray-200",
};

export function VerdictBadge({ verdict, label }: { verdict: Verdict; label: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${STYLES[verdict]}`}>
      {label}
    </span>
  );
}
