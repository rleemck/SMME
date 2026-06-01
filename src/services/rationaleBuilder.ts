import type { ConfidenceBreakdown } from "@/types/taxonomy";
import type { SECRevenueSource } from "@/types/sec";
import type { SelectedTaxonomySegment } from "@/types/taxonomy";

const WEIGHT_MAX = {
  taxonomyTermMatch: 20,
  expandedDefinitionMatch: 25,
  productDescriptionMatch: 20,
  segmentRevenueEvidence: 20,
  filingEvidenceQuality: 10,
};

export function buildEvidenceBackedRationale(
  confidence: number,
  breakdown: ConfidenceBreakdown,
  sec: SECRevenueSource | undefined,
  segments: SelectedTaxonomySegment[],
): string {
  const primary = segments.find((s) => s.isPrimary) ?? segments[0];
  const pct = Math.round(confidence * 100);
  const excerpt = sec?.sourceExcerpt?.trim();
  const shortExcerpt =
    excerpt && excerpt.length > 220 ? `${excerpt.slice(0, 220)}…` : excerpt ?? "No SEC excerpt available.";

  const taxonomyNote = primary
    ? `The company's latest ${sec?.formType ?? "SEC filing"} describes products that align with "${primary.name}" and the selected taxonomy definition.`
    : "The company aligns with the selected taxonomy segment based on SEC disclosures.";

  const sourceBlock = sec?.filingUrl
    ? `\n\nSource:\n${sec.formType}, filed ${sec.filingDate}\n${sec.filingUrl}`
    : "";

  const breakdownBlock = `
Confidence breakdown:
- Taxonomy term match: ${Math.round(breakdown.taxonomyTermMatch * WEIGHT_MAX.taxonomyTermMatch)} / ${WEIGHT_MAX.taxonomyTermMatch}
- Expanded definition semantic match: ${Math.round(breakdown.expandedDefinitionMatch * WEIGHT_MAX.expandedDefinitionMatch)} / ${WEIGHT_MAX.expandedDefinitionMatch}
- Product / business description match: ${Math.round(breakdown.productDescriptionMatch * WEIGHT_MAX.productDescriptionMatch)} / ${WEIGHT_MAX.productDescriptionMatch}
- Segment revenue evidence: ${Math.round(breakdown.segmentRevenueEvidence * WEIGHT_MAX.segmentRevenueEvidence)} / ${WEIGHT_MAX.segmentRevenueEvidence}
- SEC evidence quality: ${Math.round(breakdown.filingEvidenceQuality * WEIGHT_MAX.filingEvidenceQuality)} / ${WEIGHT_MAX.filingEvidenceQuality}
- Negative signals: ${breakdown.negativeSignals > 0 ? `-${Math.round(breakdown.negativeSignals * 100)}` : "0"}`;

  return `Confidence: ${pct}%

Rationale:
${taxonomyNote} The match is supported by the following SEC excerpt:

"${shortExcerpt}"${sourceBlock}
${breakdownBlock}`.trim();
}
