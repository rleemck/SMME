/** SEC EDGAR client — real EDGAR by default; mock only when VITE_USE_MOCK_SEC=true */

import type { RevenueLineItem, SECFilingSource, SourceSnippet } from "@/types/taxonomy";
import { edgarSecClient } from "./edgarSecClient";

export type { SECFilingSource, SourceSnippet, RevenueLineItem };

/** @deprecated use SECFilingSource */
export type SecFiling = {
  ticker: string;
  companyName: string;
  form: string;
  fiscalYear: number;
  filedAt: string;
  excerpt: string;
  revenueLines: { label: string; amountUsdM: number }[];
};

export interface SecClient {
  getLatestFiling(ticker: string): Promise<SECFilingSource | null>;
}

const MOCK_FILINGS: Record<string, SECFilingSource> = {
  CRWD: {
    companyName: "CrowdStrike Holdings, Inc.",
    ticker: "CRWD",
    cik: "0001535527",
    accessionNumber: "0001535527-24-000123",
    formType: "10-K",
    filingDate: "2025-03-20",
    fiscalYear: "2025",
    filingUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1535527&type=10-K",
    businessDescription:
      "We derive substantially all of our revenue from subscriptions to our cloud platform, including endpoint security, identity protection, and cloud security modules.",
    revenueLineItems: [
      { label: "Subscription revenue", value: 3060, period: "FY2025" },
      { label: "Endpoint security (est. segment)", value: 1840, period: "FY2025" },
    ],
    sourceSnippets: [
      {
        text: "Subscriptions to our cloud platform, including endpoint security, identity protection, and cloud security modules.",
        section: "Item 1 — Business (mock)",
        filingUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1535527&type=10-K",
      },
    ],
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
    businessDescription:
      "Revenue from our Network Security and Prisma Cloud offerings represents the majority of total revenue.",
    revenueLineItems: [{ label: "Total revenue", value: 7520, period: "FY2025" }],
    sourceSnippets: [
      {
        text: "Network Security and Prisma Cloud offerings represents the majority of total revenue.",
        section: "Item 1 — Business (mock)",
        filingUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1327567&type=10-K",
      },
    ],
  },
};

export const mockSecClient: SecClient = {
  async getLatestFiling(ticker: string) {
    await delay(200);
    const key = ticker.toUpperCase();
    if (MOCK_FILINGS[key]) return MOCK_FILINGS[key];
    return {
      companyName: ticker,
      ticker: key,
      cik: "0000000000",
      accessionNumber: "0000000000-00-000000",
      formType: "10-K",
      filingDate: "2025-01-15",
      fiscalYear: "2025",
      filingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=${key}&type=10-K`,
      businessDescription: `Business description references enterprise software aligned with ${key} product portfolio (mock SEC excerpt).`,
      revenueLineItems: [{ label: "Total revenue", value: 500 + Math.round(Math.random() * 2000), period: "FY2025" }],
      sourceSnippets: [
        {
          text: `Mock filing excerpt for ${key} — enable live SEC only in development with VITE_USE_MOCK_SEC=true.`,
          section: "Mock",
          filingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=${key}&type=10-K`,
        },
      ],
    };
  },
};

export function useMockSec(): boolean {
  return import.meta.env.VITE_USE_MOCK_SEC === "true";
}

export function getSecClient(): SecClient {
  return useMockSec() ? mockSecClient : edgarSecClient;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
