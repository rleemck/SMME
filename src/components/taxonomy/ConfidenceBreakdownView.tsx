import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ConfidenceBreakdown } from "@/types/taxonomy";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

const FACTOR_LABELS: { key: keyof ConfidenceBreakdown; label: string; weight: string }[] = [
  { key: "taxonomyTermMatch", label: "Taxonomy term match", weight: "20%" },
  { key: "expandedDefinitionMatch", label: "Expanded definition match", weight: "25%" },
  { key: "productDescriptionMatch", label: "Product / business description", weight: "20%" },
  { key: "segmentRevenueEvidence", label: "Segment revenue evidence", weight: "20%" },
  { key: "filingEvidenceQuality", label: "SEC evidence quality", weight: "10%" },
  { key: "negativeSignals", label: "Negative signals", weight: "−5% to −20%" },
];

type Props = {
  confidence: number;
  breakdown?: ConfidenceBreakdown;
  needsReview?: boolean;
};

export function ConfidenceBreakdownView({ confidence, breakdown, needsReview }: Props) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(confidence * 100);

  return (
    <div className="text-right space-y-1">
      <div className="flex items-center justify-end gap-1 flex-wrap">
        <Badge variant={confidence >= 0.85 ? "default" : "outline"}>{pct}%</Badge>
        {needsReview && (
          <Badge variant="outline" className="text-mds-warning border-mds-warning">
            Review
          </Badge>
        )}
        {breakdown && (
          <button
            type="button"
            className="p-0.5 text-muted-foreground hover:text-mds-navy"
            aria-label="Confidence rationale"
            onClick={() => setOpen((o) => !o)}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {breakdown && (
        <p className="text-[10px] text-muted-foreground text-left max-w-[220px] ml-auto leading-snug">
          {breakdown.rationale}
        </p>
      )}
      {open && breakdown && (
        <div className="mt-2 rounded border bg-surface-muted p-2 text-left text-[10px] space-y-1">
          <div className="font-semibold text-mds-navy flex items-center justify-between">
            Scoring breakdown
            <button type="button" onClick={() => setOpen(false)} aria-label="Close">
              {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
          {FACTOR_LABELS.map(({ key, label, weight }) => (
            <div key={key} className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                {label} <span className="opacity-70">({weight})</span>
              </span>
              <span className="font-mono tabular-nums">
                {key === "negativeSignals"
                  ? `−${Math.round((breakdown[key] as number) * 100)}%`
                  : `${Math.round((breakdown[key] as number) * 100)}%`}
              </span>
            </div>
          ))}
          <div className="pt-1 border-t flex justify-between font-semibold">
            <span>Final confidence</span>
            <span>{pct}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
