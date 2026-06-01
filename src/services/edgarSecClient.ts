import {
  cleanFilingParagraph,
  excerptForEvidence,
  extractFilingSections,
  isLowQualityFilingText,
} from "@/lib/filingTextParser";
import type { SECRevenueSource, SecRetrievalStatus } from "@/types/sec";

const SEC_BASE = "/api/sec";
const SEC_WWW = "/api/sec-www";

/** us-gaap tags for total company revenue — contract-revenue first; generic Revenues last (often stale). */
const REVENUE_XBRL_KEYS = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
  "SalesRevenueNet",
  "SalesRevenueGoodsNet",
  "SalesRevenueServicesNet",
  "OperatingRevenue",
  "TotalRevenue",
  "Revenues",
] as const;

const QUARTERLY_FP = new Set(["Q1", "Q2", "Q3", "Q4"]);

type XbrlFact = {
  val: number;
  end: string;
  form: string;
  fy?: number;
  fp?: string;
};

type TickerEntry = { cik_str: number; ticker: string; title: string };
let tickerCache: Map<string, { cik: string; title: string }> | null = null;

async function secFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`SEC request failed (${res.status})`);
  return res;
}

function padCik(cik: string | number): string {
  return String(cik).replace(/\D/g, "").padStart(10, "0");
}

async function loadTickerIndex(): Promise<Map<string, { cik: string; title: string }>> {
  if (tickerCache) return tickerCache;
  const res = await secFetch(`${SEC_WWW}/files/company_tickers.json`);
  const data = (await res.json()) as Record<string, TickerEntry>;
  tickerCache = new Map();
  Object.values(data).forEach((row) => {
    tickerCache!.set(row.ticker.toUpperCase(), { cik: padCik(row.cik_str), title: row.title });
  });
  return tickerCache;
}

export async function lookupCik(ticker: string): Promise<{ cik: string; companyName: string } | null> {
  const map = await loadTickerIndex();
  const hit = map.get(ticker.toUpperCase());
  if (!hit) return null;
  return { cik: hit.cik, companyName: hit.title };
}

type SubmissionsResponse = {
  name: string;
  cik: string;
  filings: {
    recent: {
      accessionNumber: string[];
      form: string[];
      filingDate: string[];
      reportDate: string[];
      primaryDocument: string[];
    };
  };
};

type FilingPick = {
  accessionNumber: string;
  filingDate: string;
  fiscalYear?: string;
  primaryDocument: string;
  formType: "10-K" | "10-Q";
};

function findLatestFiling(sub: SubmissionsResponse, form: "10-K" | "10-Q"): FilingPick | null {
  const r = sub.filings?.recent;
  if (!r) return null;
  for (let i = 0; i < r.form.length; i++) {
    if (r.form[i] === form) {
      return {
        accessionNumber: r.accessionNumber[i],
        filingDate: r.filingDate[i],
        fiscalYear: r.reportDate[i]?.slice(0, 4),
        primaryDocument: r.primaryDocument[i],
        formType: form,
      };
    }
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFilingExcerpts(plainText: string): {
  businessExcerpt: string;
  mdaExcerpt: string;
  segmentDisclosureExcerpt: string;
  sourceExcerpt: string;
} {
  const sections = extractFilingSections(plainText);
  const businessExcerpt =
    cleanFilingParagraph(sections.business, 2200) ||
    excerptForEvidence(sections.business, 2200);
  const mdaExcerpt =
    cleanFilingParagraph(sections.mda, 1600) || excerptForEvidence(sections.mda, 1600);
  const segmentDisclosureExcerpt =
    cleanFilingParagraph(sections.segment, 1200) || excerptForEvidence(sections.segment, 1200);
  const sourceExcerpt =
    businessExcerpt && !isLowQualityFilingText(businessExcerpt)
      ? businessExcerpt.slice(0, 600) + (businessExcerpt.length > 600 ? "…" : "")
      : excerptForEvidence(sections.business, 600);
  return { businessExcerpt, mdaExcerpt, segmentDisclosureExcerpt, sourceExcerpt };
}

type CompanyFacts = {
  entityName?: string;
  facts?: {
    "us-gaap"?: Record<string, { label?: string; units?: { USD?: XbrlFact[] } }>;
  };
};

type RevenuePick = {
  revenueMetric: string;
  totalCompanyRevenue: number;
  currency: string;
  sourceExcerpt: string;
  sourceLocation: string;
};

function isContractRevenueTag(key: string): boolean {
  return (
    /^RevenueFromContractWithCustomer/i.test(key) &&
    !/Liability|Remaining|Deferred|Recognized/i.test(key)
  );
}

function tagPriority(key: string): number {
  const idx = REVENUE_XBRL_KEYS.indexOf(key as (typeof REVENUE_XBRL_KEYS)[number]);
  if (idx >= 0) return idx;
  if (isContractRevenueTag(key)) return REVENUE_XBRL_KEYS.length;
  if (key === "Revenues") return 200;
  return 100;
}

/** Latest FY annual fact: 10-K only unless filing is 10-Q fallback. Dedupe by end → max(val). */
function pickLatestFyAnnualFact(usd: XbrlFact[], allowQuarterly: boolean): XbrlFact | null {
  let pool = usd.filter((u) => u.val > 0 && u.form === "10-K");
  if (!pool.length && allowQuarterly) {
    pool = usd.filter((u) => u.val > 0 && u.form === "10-Q");
  }
  if (!pool.length) return null;

  const fyRows = pool.filter((u) => u.fp === "FY");
  const nonQuarterlyFp = pool.filter((u) => !u.fp || !QUARTERLY_FP.has(u.fp));
  const work = fyRows.length ? fyRows : nonQuarterlyFp;
  if (!work.length) return null;

  const byEnd = new Map<string, XbrlFact>();
  for (const row of work) {
    const prev = byEnd.get(row.end);
    if (!prev || row.val > prev.val) byEnd.set(row.end, row);
  }

  const latestEnd = [...byEnd.keys()].sort((a, b) => b.localeCompare(a))[0];
  return latestEnd ? byEnd.get(latestEnd)! : null;
}

function discoverExtraRevenueTags(gaap: Record<string, { units?: { USD?: XbrlFact[] } }>): string[] {
  return Object.keys(gaap).filter(
    (k) =>
      isContractRevenueTag(k) &&
      !REVENUE_XBRL_KEYS.includes(k as (typeof REVENUE_XBRL_KEYS)[number]) &&
      (gaap[k]?.units?.USD?.length ?? 0) > 0,
  );
}

function pickBestRevenueFromGaap(
  gaap: Record<string, { units?: { USD?: XbrlFact[] } }>,
  filingFormType: string,
): { key: string; latest: XbrlFact; valueM: number } | null {
  const allowQuarterly = filingFormType === "10-Q";
  const keys = [...REVENUE_XBRL_KEYS, ...discoverExtraRevenueTags(gaap)];

  let best: { key: string; latest: XbrlFact; valueM: number } | null = null;

  for (const key of keys) {
    const usd = gaap[key]?.units?.USD;
    if (!usd?.length) continue;
    const latest = pickLatestFyAnnualFact(usd, allowQuarterly);
    if (!latest) continue;

    const candidate = { key, latest, valueM: Math.round(latest.val / 1_000_000) };
    if (!best) {
      best = candidate;
      continue;
    }

    const endCmp = latest.end.localeCompare(best.latest.end);
    if (endCmp > 0) {
      best = candidate;
      continue;
    }
    if (endCmp < 0) continue;

    if (tagPriority(key) < tagPriority(best.key)) best = candidate;
    else if (tagPriority(key) === tagPriority(best.key) && latest.val > best.latest.val) {
      best = candidate;
    }
  }

  return best;
}

async function extractTotalCompanyRevenue(
  cik: string,
  filingFormType: string,
): Promise<RevenuePick | null> {
  const res = await secFetch(`${SEC_BASE}/api/xbrl/companyfacts/CIK${cik}.json`);
  const facts = (await res.json()) as CompanyFacts;
  const gaap = facts.facts?.["us-gaap"];
  if (!gaap) return null;

  const hit = pickBestRevenueFromGaap(gaap, filingFormType);
  if (!hit) return null;

  const fpLabel = hit.latest.fp ? `, fp ${hit.latest.fp}` : "";
  return {
    revenueMetric: hit.key,
    totalCompanyRevenue: hit.valueM,
    currency: "USD",
    sourceExcerpt: `XBRL tag ${hit.key}: $${hit.valueM.toLocaleString()}M (period ending ${hit.latest.end}, form ${hit.latest.form}${fpLabel}).`,
    sourceLocation: `companyfacts/CIK${cik}.json · us-gaap:${hit.key}`,
  };
}

export async function fetchSECRevenueSource(ticker: string): Promise<SECRevenueSource> {
  const retrievedAt = new Date().toISOString();
  const sym = ticker.toUpperCase();

  try {
    const lookup = await lookupCik(sym);
    if (!lookup) {
      return emptySource(sym, retrievedAt, "unavailable", "Ticker not found in SEC company index.");
    }

    const { cik, companyName } = lookup;
    const subRes = await secFetch(`${SEC_BASE}/submissions/CIK${cik}.json`);
    const sub = (await subRes.json()) as SubmissionsResponse;

    let filing = findLatestFiling(sub, "10-K");
    let retrievalStatus: SecRetrievalStatus = "live";
    if (!filing) {
      filing = findLatestFiling(sub, "10-Q");
      retrievalStatus = filing ? "fallback_10q" : "unavailable";
    }
    if (!filing) {
      return {
        ...baseSource(sub.name || companyName, sym, cik, retrievedAt),
        retrievalStatus: "unavailable",
        errorMessage: "No 10-K or 10-Q filing found in EDGAR submissions.",
        revenueMetric: "—",
        totalCompanyRevenue: null,
        sourceExcerpt: "",
      };
    }

    const accNoDash = filing.accessionNumber.replace(/-/g, "");
    const cikNum = cik.replace(/^0+/, "");
    const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoDash}/${filing.primaryDocument}`;

    let sourceExcerpt = "";
    let businessExcerpt = "";
    let mdaExcerpt = "";
    let segmentDisclosureExcerpt = "";
    try {
      const docRes = await secFetch(
        `${SEC_WWW}/Archives/edgar/data/${cikNum}/${accNoDash}/${filing.primaryDocument}`,
        { headers: { Accept: "text/html,application/xhtml+xml" } },
      );
      const excerpts = buildFilingExcerpts(stripHtml(await docRes.text()));
      businessExcerpt = excerpts.businessExcerpt;
      mdaExcerpt = excerpts.mdaExcerpt;
      segmentDisclosureExcerpt = excerpts.segmentDisclosureExcerpt;
      sourceExcerpt = excerpts.sourceExcerpt;
    } catch {
      /* optional narrative */
    }

    let revenue: RevenuePick | null = null;
    try {
      revenue = await extractTotalCompanyRevenue(cik, filing.formType);
    } catch {
      /* XBRL optional */
    }

    if (!sourceExcerpt && revenue) {
      sourceExcerpt = revenue.sourceExcerpt;
    } else if (revenue && sourceExcerpt) {
      sourceExcerpt = `${sourceExcerpt}\n\n${revenue.sourceExcerpt}`;
    }

    return {
      companyName: sub.name || companyName,
      ticker: sym,
      cik,
      formType: filing.formType,
      accessionNumber: filing.accessionNumber,
      filingDate: filing.filingDate,
      fiscalYear: filing.fiscalYear,
      filingUrl,
      revenueMetric: revenue?.revenueMetric ?? "—",
      totalCompanyRevenue: revenue?.totalCompanyRevenue ?? null,
      currency: revenue?.currency ?? "USD",
      sourceExcerpt: sourceExcerpt || "Filing retrieved; revenue XBRL not available for this period.",
      businessExcerpt: businessExcerpt || undefined,
      mdaExcerpt: mdaExcerpt || undefined,
      segmentDisclosureExcerpt: segmentDisclosureExcerpt || undefined,
      sourceLocation: revenue?.sourceLocation ?? filingUrl,
      retrievalStatus,
      retrievedAt,
    };
  } catch (e) {
    return emptySource(
      sym,
      retrievedAt,
      "error",
      e instanceof Error ? e.message : "SEC retrieval failed",
    );
  }
}

function baseSource(companyName: string, ticker: string, cik: string, retrievedAt: string) {
  return {
    companyName,
    ticker,
    cik,
    formType: "—",
    accessionNumber: "—",
    filingDate: "—",
    filingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=${ticker}&type=10-K`,
    revenueMetric: "—",
    totalCompanyRevenue: null as number | null,
    currency: "USD",
    sourceExcerpt: "",
    retrievedAt,
  };
}

function emptySource(
  ticker: string,
  retrievedAt: string,
  status: SecRetrievalStatus,
  errorMessage: string,
): SECRevenueSource {
  return {
    ...baseSource(ticker, ticker, "0000000000", retrievedAt),
    retrievalStatus: status,
    errorMessage,
  };
}

export interface EdgarSecClient {
  getSECRevenueSource(ticker: string): Promise<SECRevenueSource>;
}

export const edgarSecClient: EdgarSecClient = {
  getSECRevenueSource: fetchSECRevenueSource,
};

/** @deprecated use fetchSECRevenueSource */
export async function fetchLatest10KFiling(ticker: string) {
  const s = await fetchSECRevenueSource(ticker);
  if (s.retrievalStatus === "unavailable" || s.retrievalStatus === "error") return null;
  return s;
}
