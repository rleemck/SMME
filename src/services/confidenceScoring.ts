import type { ConfidenceBreakdown, SelectedTaxonomySegment } from "@/types/taxonomy";
import type { SECRevenueSource } from "@/types/sec";

const WEIGHTS = {
  taxonomyTermMatch: 0.2,
  expandedDefinitionMatch: 0.25,
  productDescriptionMatch: 0.2,
  segmentRevenueEvidence: 0.2,
  filingEvidenceQuality: 0.1,
};

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function overlapScore(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  ta.forEach((w) => {
    if (tb.has(w)) hit++;
  });
  return Math.min(1, hit / Math.max(4, Math.min(ta.size, tb.size) * 0.35));
}

function segmentWeight(seg: SelectedTaxonomySegment, primary: SelectedTaxonomySegment): number {
  return seg.isPrimary || seg.id === primary.id ? 1 : 0.45;
}

/** Combined taxonomy text for product-description overlap; primary segment is emphasized. */
function buildCombinedDefinition(segments: SelectedTaxonomySegment[]): string {
  return segments
    .map((s) => {
      const text = `${s.name} ${s.expandedDefinition ?? s.definition ?? ""}`.trim();
      if (!text) return "";
      // Duplicate primary text so token overlap weights it ~2× vs adjacent segments.
      return s.isPrimary ? `${text} ${text}` : text;
    })
    .filter(Boolean)
    .join(" ");
}

export function computeConfidenceBreakdown(
  segments: SelectedTaxonomySegment[],
  companyName: string,
  companyDescription: string | undefined,
  sec: SECRevenueSource | null | undefined,
): ConfidenceBreakdown {
  const primary = segments.find((s) => s.isPrimary) ?? segments[0];
  if (!primary) {
    return {
      taxonomyTermMatch: 0,
      expandedDefinitionMatch: 0,
      productDescriptionMatch: 0,
      segmentRevenueEvidence: 0,
      filingEvidenceQuality: 0,
      negativeSignals: 0,
      finalConfidence: 0,
      rationale: "No taxonomy segment selected.",
    };
  }

  const combinedDef = buildCombinedDefinition(segments);

  const filingText = sec?.sourceExcerpt ?? "";

  const productText = [companyDescription ?? "", companyName, filingText].join(" ");

  let taxonomyTermMatch = 0;
  let expandedDefinitionMatch = 0;
  for (const seg of segments) {
    const w = segmentWeight(seg, primary);
    taxonomyTermMatch = Math.max(
      taxonomyTermMatch,
      overlapScore(seg.name + " " + (seg.definition ?? ""), productText) * w,
    );
    expandedDefinitionMatch = Math.max(
      expandedDefinitionMatch,
      overlapScore(seg.expandedDefinition ?? seg.definition ?? seg.name, productText) * w,
    );
  }
  taxonomyTermMatch = Math.min(1, taxonomyTermMatch);
  expandedDefinitionMatch = Math.min(1, expandedDefinitionMatch);

  const productDescriptionMatch = Math.min(1, overlapScore(combinedDef, productText));
  const segmentRevenueEvidence =
    sec?.totalCompanyRevenue != null && sec.totalCompanyRevenue > 0
      ? Math.min(1, 0.55 + (sec.revenueMetric !== "—" ? 0.25 : 0))
      : filingText
        ? 0.25
        : 0;

  const filingEvidenceQuality = sec
    ? Math.min(
        1,
        0.2 +
          (sec.retrievalStatus === "live" ? 0.45 : sec.retrievalStatus === "fallback_10q" ? 0.3 : 0.1) +
          (filingText ? 0.25 : 0),
      )
    : 0;

  let negativeSignals = 0;
  const negPatterns = [/excluded from/i, /not material/i, /discontinued operations/i, /unrelated to/i];
  if (negPatterns.some((p) => p.test(filingText + productText))) negativeSignals = 0.12;
  if (!sec || sec.retrievalStatus === "unavailable" || sec.retrievalStatus === "error") {
    negativeSignals += 0.08;
  }

  const weighted =
    taxonomyTermMatch * WEIGHTS.taxonomyTermMatch +
    expandedDefinitionMatch * WEIGHTS.expandedDefinitionMatch +
    productDescriptionMatch * WEIGHTS.productDescriptionMatch +
    segmentRevenueEvidence * WEIGHTS.segmentRevenueEvidence +
    filingEvidenceQuality * WEIGHTS.filingEvidenceQuality;

  const finalConfidence = Math.min(0.98, Math.max(0.55, weighted - negativeSignals));

  const pct = Math.round(finalConfidence * 100);
  const rationale =
    finalConfidence >= 0.85
      ? `${pct}% confidence because the company's 10-K business description and product disclosures strongly match the selected taxonomy definition, with supporting segment revenue language and no major negative signals.`
      : finalConfidence >= 0.75
        ? `${pct}% confidence because filing text and product descriptions align with the taxonomy, with moderate segment revenue evidence.`
        : `${pct}% confidence because overlap with the taxonomy is partial; review SEC excerpts and segment mapping before including revenue.`;

  return {
    taxonomyTermMatch: Math.round(taxonomyTermMatch * 100) / 100,
    expandedDefinitionMatch: Math.round(expandedDefinitionMatch * 100) / 100,
    productDescriptionMatch: Math.round(productDescriptionMatch * 100) / 100,
    segmentRevenueEvidence: Math.round(segmentRevenueEvidence * 100) / 100,
    filingEvidenceQuality: Math.round(filingEvidenceQuality * 100) / 100,
    negativeSignals: Math.round(negativeSignals * 100) / 100,
    finalConfidence: Math.round(finalConfidence * 1000) / 1000,
    rationale,
  };
}
