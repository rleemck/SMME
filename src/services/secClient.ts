/** SEC EDGAR client abstraction — mock implementation for MVP */

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
  getLatestFilings(ticker: string): Promise<SecFiling | null>;
}

const MOCK_FILINGS: Record<string, SecFiling> = {
  CRWD: {
    ticker: "CRWD",
    companyName: "CrowdStrike Holdings, Inc.",
    form: "10-K",
    fiscalYear: 2025,
    filedAt: "2025-03-20",
    excerpt:
      "We derive substantially all of our revenue from subscriptions to our cloud platform, including endpoint security, identity protection, and cloud security modules.",
    revenueLines: [
      { label: "Subscription revenue", amountUsdM: 3060 },
      { label: "Endpoint security (est. segment)", amountUsdM: 1840 },
    ],
  },
  PANW: {
    ticker: "PANW",
    companyName: "Palo Alto Networks, Inc.",
    form: "10-K",
    fiscalYear: 2025,
    filedAt: "2025-09-05",
    excerpt:
      "Revenue from our Network Security and Prisma Cloud offerings represents the majority of total revenue.",
    revenueLines: [
      { label: "Total revenue", amountUsdM: 7520 },
      { label: "Prisma Cloud (est.)", amountUsdM: 2100 },
    ],
  },
};

export const mockSecClient: SecClient = {
  async getLatestFilings(ticker: string) {
    await delay(200);
    return MOCK_FILINGS[ticker.toUpperCase()] ?? {
      ticker: ticker.toUpperCase(),
      companyName: ticker,
      form: "10-K",
      fiscalYear: 2025,
      filedAt: "2025-01-15",
      excerpt: `Business description references enterprise software aligned with ${ticker} product portfolio (mock SEC excerpt).`,
      revenueLines: [{ label: "Total revenue", amountUsdM: 500 + Math.random() * 2000 }],
    };
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
