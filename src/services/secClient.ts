/** SEC EDGAR client — live EDGAR by default; mock only when VITE_USE_MOCK_SEC_DATA=true (not in production flow) */

import type { SECRevenueSource } from "@/types/sec";
import { edgarSecClient } from "./edgarSecClient";

export type { SECRevenueSource };

export interface SecClient {
  getSECRevenueSource(ticker: string): Promise<SECRevenueSource>;
}

const MOCK_SOURCES: Record<string, SECRevenueSource> = {
  CRWD: {
    companyName: "CrowdStrike Holdings, Inc.",
    ticker: "CRWD",
    cik: "0001535527",
    accessionNumber: "0001535527-24-000123",
    formType: "10-K",
    filingDate: "2025-03-20",
    fiscalYear: "2025",
    filingUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1535527&type=10-K",
    revenueMetric: "Revenues",
    totalCompanyRevenue: 3060,
    currency: "USD",
    sourceExcerpt:
      "We derive substantially all of our revenue from subscriptions to our cloud platform, including endpoint security, identity protection, and cloud security modules.",
    sourceLocation: "Item 1 — Business (mock)",
    retrievalStatus: "live",
    retrievedAt: new Date().toISOString(),
  },
  PANW: {
    companyName: "Palo Alto Networks, Inc.",
    ticker: "PANW",
    cik: "0001327567",
    accessionNumber: "0001327567-24-000456",
    formType: "10-K",
    filingDate: "2025-09-05",
    fiscalYear: "2025",
    filingUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1327567&type=10-K",
    revenueMetric: "Revenues",
    totalCompanyRevenue: 7520,
    currency: "USD",
    sourceExcerpt:
      "Revenue from our Network Security and Prisma Cloud offerings represents the majority of total revenue.",
    sourceLocation: "Item 1 — Business (mock)",
    retrievalStatus: "live",
    retrievedAt: new Date().toISOString(),
  },
};

export const mockSecClient: SecClient = {
  async getSECRevenueSource(ticker: string) {
    await delay(200);
    const key = ticker.toUpperCase();
    if (MOCK_SOURCES[key]) {
      return { ...MOCK_SOURCES[key], retrievedAt: new Date().toISOString() };
    }
    return {
      companyName: ticker,
      ticker: key,
      cik: "0000000000",
      accessionNumber: "0000000000-00-000000",
      formType: "10-K",
      filingDate: "2025-01-15",
      fiscalYear: "2025",
      filingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=${key}&type=10-K`,
      revenueMetric: "Revenues",
      totalCompanyRevenue: 500 + Math.round(Math.random() * 2000),
      currency: "USD",
      sourceExcerpt: `Mock SEC excerpt for ${key} (not live EDGAR).`,
      sourceLocation: "Mock",
      retrievalStatus: "live",
      retrievedAt: new Date().toISOString(),
    };
  },
};

export function useMockSec(): boolean {
  const flag = import.meta.env.VITE_USE_MOCK_SEC_DATA;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return import.meta.env.VITE_USE_MOCK_SEC === "true";
}

export function getSecClient(): SecClient {
  return useMockSec() ? mockSecClient : edgarSecClient;
}

export async function enrichWithSecRevenue(tickers: string[]): Promise<Map<string, SECRevenueSource>> {
  const sec = getSecClient();
  const map = new Map<string, SECRevenueSource>();
  for (const t of tickers) {
    try {
      const source = await sec.getSECRevenueSource(t);
      map.set(t.toUpperCase(), source);
      if (!useMockSec()) await delay(150);
    } catch (e) {
      const sym = t.toUpperCase();
      map.set(sym, {
        companyName: sym,
        ticker: sym,
        cik: "0000000000",
        formType: "—",
        accessionNumber: "—",
        filingDate: "—",
        filingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=${sym}`,
        revenueMetric: "—",
        totalCompanyRevenue: null,
        currency: "USD",
        sourceExcerpt: "",
        retrievalStatus: "error",
        retrievedAt: new Date().toISOString(),
        errorMessage: e instanceof Error ? e.message : "Retrieval failed",
      });
    }
  }
  return map;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
