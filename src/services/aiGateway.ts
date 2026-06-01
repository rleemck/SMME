import type { TaxonomySelection, VendorMatch } from "@/types/taxonomy";
import type { SecFiling } from "./secClient";

export type AiMatchRequest = {
  segment: TaxonomySelection;
  adjacentSegments?: TaxonomySelection[];
  candidateCompanies: { name: string; ticker: string; exchange?: string; description?: string }[];
  filingExcerpts?: { ticker: string; excerpt: string }[];
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

function pickSeed(segment: TaxonomySelection) {
  const text = `${segment.name} ${segment.expandedDefinition ?? ""}`.toLowerCase();
  if (/security|cyber|endpoint|identity|zero trust|cnapp/i.test(text)) return SEGMENT_VENDOR_SEEDS.security;
  if (/analytics|business intelligence|bi\b|dashboard/i.test(text)) return SEGMENT_VENDOR_SEEDS.analytics;
  if (/crm|customer relationship|sales force automation/i.test(text)) return SEGMENT_VENDOR_SEEDS.crm;
  return SEGMENT_VENDOR_SEEDS.default;
}

export const mockAiGateway: AiGateway = {
  async matchVendors(req) {
    await new Promise((r) => setTimeout(r, 600));
    const seeds = pickSeed(req.segment);
    const companyByTicker = new Map(
      req.candidateCompanies.map((c) => [c.ticker.toUpperCase(), c]),
    );

    return seeds.map((s, i) => {
      const co = companyByTicker.get(s.ticker);
      const filing = req.filingExcerpts?.find((f) => f.ticker === s.ticker);
      const confidence = 0.92 - i * 0.04 + (filing ? 0.03 : 0);
      const baseRev = 800 + Math.round(Math.random() * 4000);
      return {
        companyName: co?.name ?? s.name,
        ticker: s.ticker,
        exchange: co?.exchange,
        confidence: Math.min(0.98, Math.max(0.65, confidence)),
        matchedSegment: req.segment.name,
        taxonomyPath: req.segment.path,
        rationale: `Matched via expanded definition keywords, product overlap with "${req.segment.name}", and ${
          filing ? "SEC 10-K excerpt alignment" : "taxonomy segment naming"
        }.`,
        supportingEvidence: [
          (req.segment.expandedDefinition?.slice(0, 180)
            ? req.segment.expandedDefinition.slice(0, 180) + "…"
            : req.segment.definition) ?? "",
          filing?.excerpt ?? `Ticker ${s.ticker} appears in public software universe (Companies tab).`,
        ].filter(Boolean),
        estimatedSegmentRevenue: Math.round(baseRev * s.share),
        estimatedSegmentShare: s.share,
        needsReview: confidence < 0.8,
      } satisfies VendorMatch;
    });
  },
};

export async function enrichWithFilings(
  tickers: string[],
  sec: { getLatestFilings(t: string): Promise<SecFiling | null> },
): Promise<{ ticker: string; excerpt: string }[]> {
  const out: { ticker: string; excerpt: string }[] = [];
  for (const t of tickers.slice(0, 8)) {
    const f = await sec.getLatestFilings(t);
    if (f) out.push({ ticker: t, excerpt: f.excerpt });
  }
  return out;
}
