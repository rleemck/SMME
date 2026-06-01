import { useState } from "react";
import type { EvidenceItem } from "@/types/taxonomy";
import { ExternalLink } from "lucide-react";

type Props = {
  evidence: EvidenceItem[];
  maxVisible?: number;
};

export function EvidenceExpandable({ evidence, maxVisible = 2 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const items = evidence.length ? evidence : [];
  const hasMore = items.length > maxVisible;
  const visible = expanded ? items : items.slice(0, maxVisible);

  if (!items.length) {
    return <span className="text-xs text-muted-foreground">No filing evidence yet.</span>;
  }

  return (
    <div className="space-y-2">
      <ul className="text-[11px] text-muted-foreground space-y-2 list-none pl-0">
        {visible.map((e, i) => (
          <li key={i} className="border-l-2 border-mds-blue/30 pl-2">
            {e.section && (
              <div className="text-[10px] font-semibold uppercase text-mds-navy/70 mb-0.5">{e.section}</div>
            )}
            <p className="whitespace-normal break-words leading-snug">{e.text}</p>
            {(e.filingUrl || e.formType || e.fiscalYear) && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                {e.formType && <span>{e.formType}</span>}
                {e.fiscalYear && <span>FY {e.fiscalYear}</span>}
                {e.filingUrl && (
                  <a
                    href={e.filingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-mds-blue hover:underline"
                  >
                    SEC filing <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          className="text-[11px] font-medium text-mds-blue hover:underline"
          onClick={() => setExpanded((x) => !x)}
        >
          {expanded ? "Show less" : `Show more (${items.length - maxVisible} more)`}
        </button>
      )}
    </div>
  );
}
