import type { TaxonomySelection, VendorMatch, PublicCompany } from "@/types/taxonomy";
import companiesData from "@/data/companies.json";
import { mockAiGateway, enrichWithFilings } from "./aiGateway";
import { mockSecClient } from "./secClient";

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

export async function runVendorMatching(
  segment: TaxonomySelection,
  adjacent: TaxonomySelection[] = [],
): Promise<VendorMatch[]> {
  const seeds = ["MSFT", "ORCL", "CRM", "ADBE", "NOW", "PANW", "CRWD", "ZS", "SNOW", "DDOG"];
  const candidates = seeds
    .map((t) => TICKER_INDEX.get(t))
    .filter(Boolean) as PublicCompany[];

  const filingExcerpts = await enrichWithFilings(
    candidates.map((c) => c.ticker),
    mockSecClient,
  );

  return mockAiGateway.matchVendors({
    segment,
    adjacentSegments: adjacent,
    candidateCompanies: candidates.map((c) => ({
      name: c.companyName,
      ticker: c.ticker,
      exchange: c.exchange,
      description: c.description,
    })),
    filingExcerpts,
  });
}
