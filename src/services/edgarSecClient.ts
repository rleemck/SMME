import type { SECRevenueSource, SecRetrievalStatus } from "@/types/sec";

const SEC_BASE = "/api/sec";
const SEC_WWW = "/api/sec-www";

/** Preferred us-gaap tags for total company revenue (order matters). */
const REVENUE_XBRL_KEYS = [
  "Revenues",
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
  "SalesRevenueNet",
  "SalesRevenueGoodsNet",
  "SalesRevenueServicesNet",
  "OperatingRevenue",
  "TotalRevenue",
] as const;

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

function extractBusinessExcerpt(text: string): string {
  const cleaned = text.slice(0, 500_000);
  const item1 = cleaned.match(/item\s*1[\.\s]*business/i);
  const start = item1?.index ?? 0;
  return cleaned.slice(start, start + 1200).trim();
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

/** Pick latest annual fact; prefer 10-K FY rows when SEC provides fp. */
function pickLatestAnnualFact(facts: XbrlFact[], formType: string): XbrlFact | null {
  const annual = facts.filter((u) => u.form === formType || u.form === "10-K");
  const pool = annual.length ? annual : facts;
  const fyRows = pool.filter((u) => u.fp === "FY");
  const ranked = [...(fyRows.length ? fyRows : pool)].sort((a, b) => b.end.localeCompare(a.end));
  const seen = new Set<string>();
  for (const row of ranked) {
    if (seen.has(row.end)) continue;
    seen.add(row.end);
    if (row.val > 0) return row;
  }
  return null;
}

function pickFromGaapTag(gaap: Record<string, { units?: { USD?: XbrlFact[] } }>, key: string, formType: string) {
  const usd = gaap[key]?.units?.USD;
  if (!usd?.length) return null;
  const latest = pickLatestAnnualFact(usd, formType);
  if (!latest) return null;
  const valueM = Math.round(latest.val / 1_000_000);
  return { key, latest, valueM };
}

async function extractTotalCompanyRevenue(
  cik: string,
  formType: string,
): Promise<RevenuePick | null> {
  const res = await secFetch(`${SEC_BASE}/api/xbrl/companyfacts/CIK${cik}.json`);
  const facts = (await res.json()) as CompanyFacts;
  const gaap = facts.facts?.["us-gaap"];
  if (!gaap) return null;

  for (const key of REVENUE_XBRL_KEYS) {
    const hit = pickFromGaapTag(gaap, key, formType);
    if (!hit) continue;
    return {
      revenueMetric: hit.key,
      totalCompanyRevenue: hit.valueM,
      currency: "USD",
      sourceExcerpt: `XBRL tag ${hit.key}: $${hit.valueM.toLocaleString()}M (period ending ${hit.latest.end}, form ${hit.latest.form}).`,
      sourceLocation: `companyfacts/CIK${cik}.json · us-gaap:${hit.key}`,
    };
  }

  // Fallback: scan us-gaap for contract/total revenue tags many filers use
  const fallbackKey = Object.keys(gaap).find(
    (k) =>
      /^RevenueFromContractWithCustomer/i.test(k) &&
      !/Liability|Remaining|Deferred/i.test(k) &&
      (gaap[k]?.units?.USD?.length ?? 0) > 0,
  );
  if (fallbackKey) {
    const hit = pickFromGaapTag(gaap, fallbackKey, formType);
    if (hit) {
      return {
        revenueMetric: hit.key,
        totalCompanyRevenue: hit.valueM,
        currency: "USD",
        sourceExcerpt: `XBRL tag ${hit.key}: $${hit.valueM.toLocaleString()}M (period ending ${hit.latest.end}, form ${hit.latest.form}).`,
        sourceLocation: `companyfacts/CIK${cik}.json · us-gaap:${hit.key}`,
      };
    }
  }

  return null;
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
    try {
      const docRes = await secFetch(
        `${SEC_WWW}/Archives/edgar/data/${cikNum}/${accNoDash}/${filing.primaryDocument}`,
        { headers: { Accept: "text/html,application/xhtml+xml" } },
      );
      const excerpt = extractBusinessExcerpt(stripHtml(await docRes.text()));
      sourceExcerpt = excerpt.slice(0, 600) + (excerpt.length > 600 ? "…" : "");
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
