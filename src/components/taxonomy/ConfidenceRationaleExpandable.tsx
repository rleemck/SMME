import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  rationale: string;
  confidence: number;
};

export function ConfidenceRationaleExpandable({ rationale, confidence }: Props) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(confidence * 100);
  const preview = rationale.split("\n").slice(0, 2).join("\n");

  if (!rationale.trim()) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="min-w-0 w-full">
      <button
        type="button"
        className="text-left w-full text-xs sm:text-sm text-muted-foreground hover:text-mds-navy"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-semibold text-mds-navy">{pct}% confidence</span>
        <span className="ml-1 text-mds-blue">{open ? "Hide rationale" : "View rationale"}</span>
        {open ? (
          <ChevronUp className="inline h-3 w-3 ml-0.5" />
        ) : (
          <ChevronDown className="inline h-3 w-3 ml-0.5" />
        )}
      </button>
      {open ? (
        <pre className="mt-2 text-xs sm:text-sm whitespace-pre-wrap break-words font-sans leading-relaxed text-foreground/90 bg-muted/40 rounded p-3 border max-h-[min(32rem,70vh)] overflow-y-auto">
          {rationale}
        </pre>
      ) : (
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
          {preview}
          {rationale.split("\n").length > 2 && (
            <span className="text-mds-blue"> …</span>
          )}
        </p>
      )}
    </div>
  );
}
