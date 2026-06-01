/** SEC EDGAR revenue retrieval types */

export type SecRetrievalStatus =
  | "live"
  | "unavailable"
  | "fallback_10q"
  | "error";

export type SECRevenueSource = {
  companyName: string;
  ticker: string;
  cik: string;
  formType: "10-K" | "10-Q" | string;
  accessionNumber: string;
  filingDate: string;
  fiscalYear?: string;
  filingUrl: string;
  revenueMetric: string;
  totalCompanyRevenue: number | null;
  currency?: string;
  sourceExcerpt: string;
  /** Item 1 Business — product/business narrative (no TOC) */
  businessExcerpt?: string;
  /** Item 7 MD&A — management discussion excerpts */
  mdaExcerpt?: string;
  /** Segment / reportable segment disclosure */
  segmentDisclosureExcerpt?: string;
  sourceLocation?: string;
  retrievalStatus: SecRetrievalStatus;
  retrievedAt: string;
  errorMessage?: string;
};

export const REVENUE_HELPER_TEXT =
  "Revenue is pulled from each vendor's latest SEC filing at total company level, irrespective of geography.";

export const SEC_STATUS_LABELS: Record<SecRetrievalStatus, string> = {
  live: "Live SEC data retrieved",
  unavailable: "SEC data unavailable",
  fallback_10q: "Fallback used: latest 10-Q",
  error: "Error retrieving SEC filing",
};
