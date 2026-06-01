import type { SelectedTaxonomySegment, TaxonomySelection, VendorMatch, PublicCompany } from "@/types/taxonomy";
import companiesData from "@/data/companies.json";
import { segmentToSelection } from "@/lib/taxonomy/segments";
import { structuredAiGateway, segmentsFromTaxonomy } from "./aiGateway";
import { enrichWithSecRevenue, useMockSec } from "./secClient";

const companies = companiesData as PublicCompany[];

const TICKER_INDEX = new Map(
  companies.filter((c) => c.ticker).map((c) => [c.ticker.toUpperCase(), c]),
);

export function lookupCompany(ticker: string): PublicCompany | undefined {
  return TICKER_INDEX.get(ticker.toUpperCase());
}

export function searchCompanies(query: string, limit = 50): PublicCompany[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return companies
    .filter(
      (c) =>
        c.ticker.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q),
    )
    .slice(0, limit);
}

function pickCandidateTickers(segments: SelectedTaxonomySegment[]): string[] {
  const text = segments
    .map((s) => `${s.name} ${s.expandedDefinition ?? s.definition ?? ""}`)
    .join(" ")
    .toLowerCase();

  if (/security|cyber|endpoint/i.test(text)) {
    return ["CRWD", "PANW", "ZS", "FTNT", "S", "OKTA", "MSFT"];
  }
  if (/analytics|data platform|warehouse/i.test(text)) {
    return ["SNOW", "DDOG", "MSFT", "ORCL", "CRM", "PLTR"];
  }
  return ["MSFT", "ORCL", "CRM", "ADBE", "NOW", "PANW", "CRWD", "ZS", "SNOW", "DDOG"];
}

export async function runVendorMatching(
  segment: TaxonomySelection,
  adjacent: TaxonomySelection[] = [],
  segments?: SelectedTaxonomySegment[],
): Promise<VendorMatch[]> {
  const allSegments = segments ?? segmentsFromTaxonomy(segment, adjacent);
  const seeds = pickCandidateTickers(allSegments);
  const candidates = seeds
    .map((t) => TICKER_INDEX.get(t))
    .filter(Boolean) as PublicCompany[];

  const secRevenues = await enrichWithSecRevenue(candidates.map((c) => c.ticker));

  if (!useMockSec()) {
    const liveCount = [...secRevenues.values()].filter(
      (s) => s.retrievalStatus === "live" || s.retrievalStatus === "fallback_10q",
    ).length;
    if (liveCount === 0) {
      console.warn("No live SEC data retrieved for candidate vendors.");
    }
  }

  return structuredAiGateway.matchVendors({
    segments: allSegments,
    candidateCompanies: candidates.map((c) => ({
      name: c.companyName,
      ticker: c.ticker,
      exchange: c.exchange,
      description: c.description,
    })),
    secRevenues,
  });
}

export async function runVendorMatchingFromSegments(
  segments: SelectedTaxonomySegment[],
): Promise<VendorMatch[]> {
  const primary = segments.find((s) => s.isPrimary) ?? segments[0];
  if (!primary) return [];
  const adjacent = segments.filter((s) => !s.isPrimary).map(segmentToSelection);
  return runVendorMatching(segmentToSelection(primary), adjacent, segments);
}
