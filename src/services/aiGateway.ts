import type {
  EvidenceItem,
  SECFilingSource,
  SelectedTaxonomySegment,
  TaxonomySelection,
  VendorMatch,
} from "@/types/taxonomy";
import { computeConfidenceBreakdown } from "./confidenceScoring";

export type AiMatchRequest = {
  segments: SelectedTaxonomySegment[];
  candidateCompanies: { name: string; ticker: string; exchange?: string; description?: string }[];
  filings: Map<string, SECFilingSource>;
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

function buildEvidenceItems(filing: SECFilingSource | undefined, segments: SelectedTaxonomySegment[]): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const primary = segments.find((s) => s.isPrimary) ?? segments[0];

  if (primary?.expandedDefinition || primary?.definition) {
    items.push({
      text: (primary.expandedDefinition ?? primary.definition)!.slice(0, 280),
      section: "Taxonomy definition (primary)",
    });
  }

  for (const seg of segments.filter((s) => !s.isPrimary)) {
    if (seg.definition) {
      items.push({
        text: `${seg.name}: ${seg.definition.slice(0, 200)}`,
        section: "Adjacent segment definition",
      });
    }
  }

  if (filing) {
    filing.sourceSnippets.forEach((s) => {
      items.push({
        text: s.text,
        section: s.section,
        filingUrl: s.filingUrl,
        formType: filing.formType,
        fiscalYear: filing.fiscalYear,
        filingDate: filing.filingDate,
      });
    });
    if (filing.businessDescription && !items.some((i) => i.section?.includes("Business"))) {
      items.push({
        text: filing.businessDescription.slice(0, 400),
        section: "Item 1 — Business",
        filingUrl: filing.filingUrl,
        formType: filing.formType,
        fiscalYear: filing.fiscalYear,
        filingDate: filing.filingDate,
      });
    }
  }

  return items;
}

function filingToExcerptStrings(filing: SECFilingSource): string[] {
  return [
    filing.businessDescription ?? "",
    ...(filing.segmentRevenueText ?? []),
    ...filing.sourceSnippets.map((s) => s.text),
  ].filter(Boolean);
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
      const filing = req.filings.get(s.ticker);
      const breakdown = computeConfidenceBreakdown(
        req.segments,
        co?.name ?? s.name,
        co?.description,
        filing,
      );
      const confidence = breakdown.finalConfidence;
      const totalRev =
        filing?.revenueLineItems?.[0]?.value ?? 800 + Math.round(Math.random() * 4000);
      const evidenceItems = buildEvidenceItems(filing, req.segments);

      return {
        companyName: co?.name ?? filing?.companyName ?? s.name,
        ticker: s.ticker,
        exchange: co?.exchange,
        confidence,
        confidenceBreakdown: breakdown,
        matchedSegment: primary.name,
        taxonomyPath: primary.path,
        rationale: breakdown.rationale,
        supportingEvidence: evidenceItems.map((e) => e.text).filter(Boolean),
        evidenceItems,
        secFiling: filing,
        estimatedSegmentRevenue: Math.round(totalRev * s.share),
        estimatedSegmentShare: s.share,
        needsReview: confidence < 0.8,
      } satisfies VendorMatch;
    });
  },
};

/** @deprecated use structuredAiGateway */
export const mockAiGateway = structuredAiGateway;

export async function enrichWithFilings(
  tickers: string[],
  sec: { getLatestFiling(t: string): Promise<SECFilingSource | null> },
): Promise<Map<string, SECFilingSource>> {
  const map = new Map<string, SECFilingSource>();
  for (const t of tickers.slice(0, 8)) {
    try {
      const f = await sec.getLatestFiling(t);
      if (f) map.set(t.toUpperCase(), f);
    } catch {
      /* skip unavailable */
    }
  }
  return map;
}

/** Legacy adapter */
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
