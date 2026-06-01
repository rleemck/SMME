import { useState } from "react";
import { ConfidenceBreakdownView } from "./ConfidenceBreakdownView";
import type { ConfidenceBreakdown } from "@/types/taxonomy";

type Props = {
  confidence: number;
  rationale?: string;
  breakdown?: ConfidenceBreakdown;
  needsReview?: boolean;
  maxLines?: number;
};

export function VendorRationaleExpandable({
  confidence,
  rationale,
  breakdown,
  needsReview,
  maxLines = 4,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const text = rationale ?? "";
  const truncated = text.length > 280 && !expanded;

  return (
    <div className="space-y-2 min-w-[180px]">
      <ConfidenceBreakdownView
        confidence={confidence}
        breakdown={breakdown}
        needsReview={needsReview}
      />
      <div
        className={`text-[11px] text-muted-foreground whitespace-pre-wrap break-words leading-snug ${
          !expanded && truncated ? `line-clamp-${maxLines}` : ""
        }`}
        style={!expanded && truncated ? { WebkitLineClamp: maxLines, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
      >
        {text}
      </div>
      {text.length > 280 && (
        <button
          type="button"
          className="text-[11px] font-medium text-mds-blue hover:underline"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
