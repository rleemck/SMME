import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { EvidenceCard, EvidenceStrength } from "@/types/evidence";

const STRENGTH_STYLES: Record<EvidenceStrength, string> = {
  Strong: "bg-emerald-100 text-emerald-900 border-emerald-300",
  Medium: "bg-amber-100 text-amber-900 border-amber-300",
  Weak: "bg-slate-100 text-slate-600 border-slate-300",
};

const SOURCE_LABELS: Record<EvidenceCard["sourceType"], string> = {
  SEC_BUSINESS_DESCRIPTION: "10-K Item 1 — Business",
  SEC_PRODUCT_DISCLOSURE: "10-K MD&A / products",
  SEC_SEGMENT_DISCLOSURE: "Segment disclosure",
  TAXONOMY_MATCH: "Taxonomy mapping",
};

type Props = {
  cards: EvidenceCard[];
  companyName?: string;
  segmentName?: string;
  secStatus?: string;
  maxVisible?: number;
};

function formatFiledDate(filingDate: string): string {
  if (!filingDate || filingDate === "—") return "—";
  const d = new Date(filingDate);
  if (Number.isNaN(d.getTime())) return filingDate;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function EvidenceCardView({ card, companyName }: { card: EvidenceCard; companyName?: string }) {
  const quotePrefix =
    card.sourceType === "SEC_BUSINESS_DESCRIPTION" && companyName
      ? `${companyName} states:`
      : card.sourceType === "TAXONOMY_MATCH"
        ? ""
        : "SEC filing states:";

  return (
    <div className="rounded-md border bg-white/80 p-2.5 space-y-1.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-mds-navy/80">
          {SOURCE_LABELS[card.sourceType]}
        </span>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${STRENGTH_STYLES[card.strength]}`}
        >
          {card.strength}
        </span>
      </div>
      {quotePrefix && (
        <p className="text-xs font-medium text-mds-navy">{quotePrefix}</p>
      )}
      <blockquote
        className={`text-xs sm:text-sm text-foreground/90 leading-relaxed border-l-2 border-mds-blue/40 pl-2 break-words ${
          card.sourceType === "TAXONOMY_MATCH" ? "whitespace-pre-wrap not-italic" : "italic"
        }`}
      >
        {card.excerpt}
      </blockquote>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
        <span className="font-semibold text-mds-navy/80">Why it matches: </span>
        {card.explanation}
      </p>
      <div className="text-xs text-muted-foreground pt-0.5 border-t border-dashed">
        <div>
          <span className="font-semibold">Source: </span>
          {card.filingType} | Filed {formatFiledDate(card.filingDate)}
        </div>
        {card.filingUrl && (
          <a
            href={card.filingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-mds-blue hover:underline mt-0.5 font-medium"
          >
            Open SEC Filing <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export function EvidenceCardsExpandable({
  cards,
  companyName,
  segmentName,
  secStatus,
  maxVisible = 2,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...cards].sort((a, b) => b.strengthScore - a.strengthScore);
  const visible = expanded ? sorted : sorted.slice(0, maxVisible);
  const hidden = sorted.length - maxVisible;

  if (!sorted.length) {
    const seg = segmentName ? `“${segmentName}”` : "your selected segment";
    if (secStatus === "unavailable" || secStatus === "error") {
      return (
        <span className="text-xs sm:text-sm text-muted-foreground leading-relaxed block">
          Could not load this company&apos;s 10-K from SEC EDGAR. Start the app with{" "}
          <code className="text-xs">npm run dev</code> (proxy required), then click Generate on Step 1.
        </span>
      );
    }
    return (
      <span className="text-xs sm:text-sm text-muted-foreground leading-relaxed block">
        No Item 1 excerpt yet for {seg}. Click <strong>Generate</strong> on Step 1 with live SEC enabled to
        pull the 10-K business description and IAM fit rationale.
      </span>
    );
  }

  return (
    <div className="space-y-2 min-w-0 w-full">
      {visible.map((card, i) => (
        <EvidenceCardView key={`${card.sourceType}-${i}`} card={card} companyName={companyName} />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          className="text-[11px] font-medium text-mds-blue hover:underline"
          onClick={() => setExpanded((x) => !x)}
        >
          {expanded ? "Show less" : `Show all evidence (${sorted.length})`}
        </button>
      )}
    </div>
  );
}
