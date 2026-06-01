import type { SelectedTaxonomySegment, TaxonomySelection, VendorMatch } from "@/types/taxonomy";
import type { SECRevenueSource } from "@/types/sec";
import { computeConfidenceBreakdown } from "./confidenceScoring";
import {
  buildStructuredConfidenceRationale,
  buildVendorEvidenceCards,
} from "./evidenceBuilder";

export type AiMatchRequest = {
  segments: SelectedTaxonomySegment[];
  candidateCompanies: { name: string; ticker: string; exchange?: string; description?: string }[];
  secRevenues: Map<string, SECRevenueSource>;
};

export interface AiGateway {
  matchVendors(req: AiMatchRequest): Promise<VendorMatch[]>;
}

const SEGMENT_VENDOR_SEEDS: Record<string, { ticker: string; name: string; share: number }[]> = {
  security: [
    { ticker: "CRWD", name: "CrowdStrike", share: 0.18 },
    { ticker: "PANW", name: "Palo Alto Networks", share: 0.22 },
    { ticker: "ZS", name: "Zscaler", share: 0.11 },
    { ticker: "FTNT", name: "Fortinet", share: 0.15 },
    { ticker: "S", name: "SentinelOne", share: 0.05 },
    { ticker: "OKTA", name: "Okta", share: 0.12 },
  ],
  analytics: [
    { ticker: "SNOW", name: "Snowflake", share: 0.14 },
    { ticker: "DDOG", name: "Datadog", share: 0.1 },
    { ticker: "CRM", name: "Salesforce", share: 0.2 },
    { ticker: "ORCL", name: "Oracle", share: 0.18 },
    { ticker: "MSFT", name: "Microsoft", share: 0.25 },
  ],
  crm: [
    { ticker: "CRM", name: "Salesforce", share: 0.35 },
    { ticker: "HUBS", name: "HubSpot", share: 0.08 },
    { ticker: "MSFT", name: "Microsoft", share: 0.15 },
    { ticker: "ORCL", name: "Oracle", share: 0.12 },
  ],
  default: [
    { ticker: "MSFT", name: "Microsoft", share: 0.12 },
    { ticker: "ORCL", name: "Oracle", share: 0.1 },
    { ticker: "SAP", name: "SAP SE", share: 0.09 },
    { ticker: "ADBE", name: "Adobe", share: 0.08 },
    { ticker: "CRM", name: "Salesforce", share: 0.07 },
    { ticker: "NOW", name: "ServiceNow", share: 0.06 },
  ],
};

function pickSeed(segments: SelectedTaxonomySegment[]) {
  const text = segments
    .map((s) => `${s.name} ${s.expandedDefinition ?? s.definition ?? ""}`)
    .join(" ")
    .toLowerCase();
  if (/security|cyber|endpoint|identity|zero trust|cnapp/i.test(text)) return SEGMENT_VENDOR_SEEDS.security;
  if (/analytics|business intelligence|bi\b|dashboard/i.test(text)) return SEGMENT_VENDOR_SEEDS.analytics;
  if (/crm|customer relationship|sales force automation/i.test(text)) return SEGMENT_VENDOR_SEEDS.crm;
  return SEGMENT_VENDOR_SEEDS.default;
}

export const structuredAiGateway: AiGateway = {
  async matchVendors(req) {
    const primary = req.segments.find((s) => s.isPrimary) ?? req.segments[0];
    if (!primary) return [];

    const seeds = pickSeed(req.segments);
    const companyByTicker = new Map(
      req.candidateCompanies.map((c) => [c.ticker.toUpperCase(), c]),
    );

    return seeds.map((s) => {
      const co = companyByTicker.get(s.ticker);
      const sec = req.secRevenues.get(s.ticker);
      const breakdown = computeConfidenceBreakdown(
        req.segments,
        co?.name ?? s.name,
        co?.description,
        sec,
      );
      const confidence = breakdown.finalConfidence;
      const companyName = co?.name ?? sec?.companyName ?? s.name;
      const evidenceCards = buildVendorEvidenceCards(companyName, sec, req.segments, co?.description, {
        forScoping: true,
      });
      const confidenceRationaleDetailed = buildStructuredConfidenceRationale(
        confidence,
        breakdown,
        evidenceCards,
        req.segments,
        { companyName, forScoping: true },
      );
      const totalRev = sec?.totalCompanyRevenue ?? null;

      const hasSecFiling =
        sec?.retrievalStatus === "live" || sec?.retrievalStatus === "fallback_10q";
      const segmentRev =
        totalRev != null
          ? Math.round(totalRev * s.share)
          : hasSecFiling
            ? undefined
            : Math.round(800 * s.share);

      return {
        companyName,
        ticker: s.ticker,
        exchange: co?.exchange,
        confidence,
        confidenceBreakdown: breakdown,
        matchedSegment: primary.name,
        taxonomyPath: primary.path,
        rationale: confidenceRationaleDetailed,
        supportingEvidence: evidenceCards.map((c) => c.excerpt).filter(Boolean),
        evidenceItems: [],
        evidenceCards,
        confidenceRationaleDetailed,
        secRevenue: sec,
        estimatedSegmentRevenue: segmentRev,
        estimatedSegmentShare: s.share,
        needsReview: confidence < 0.8 || sec?.retrievalStatus === "unavailable",
      } satisfies VendorMatch;
    });
  },
};

export const mockAiGateway = structuredAiGateway;

export function segmentsFromTaxonomy(
  segment: TaxonomySelection,
  adjacent: TaxonomySelection[] = [],
): SelectedTaxonomySegment[] {
  const toSeg = (sel: TaxonomySelection, isPrimary: boolean): SelectedTaxonomySegment => ({
    id: sel.nodeId,
    name: sel.name,
    level: (["L1", "L2", "L3", "L4", "L5"].includes(sel.level) ? sel.level : "L3") as SelectedTaxonomySegment["level"],
    path: sel.path,
    definition: sel.definition,
    expandedDefinition: sel.expandedDefinition,
    isPrimary,
  });
  return [toSeg(segment, true), ...adjacent.map((a) => toSeg(a, false))];
}
