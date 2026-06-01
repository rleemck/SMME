import type { RevenueLineItem, SECFilingSource, SourceSnippet } from "@/types/taxonomy";

const SEC_BASE = "/api/sec";
const SEC_WWW = "/api/sec-www";

type TickerEntry = { cik_str: number; ticker: string; title: string };
let tickerCache: Map<string, { cik: string; title: string }> | null = null;

async function secFetch(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`SEC request failed (${res.status}): ${url}`);
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
    tickerCache!.set(row.ticker.toUpperCase(), {
      cik: padCik(row.cik_str),
      title: row.title,
    });
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

function findLatest10K(sub: SubmissionsResponse): {
  accessionNumber: string;
  filingDate: string;
  fiscalYear?: string;
  primaryDocument: string;
} | null {
  const r = sub.filings?.recent;
  if (!r) return null;
  for (let i = 0; i < r.form.length; i++) {
    if (r.form[i] === "10-K") {
      return {
        accessionNumber: r.accessionNumber[i],
        filingDate: r.filingDate[i],
        fiscalYear: r.reportDate[i]?.slice(0, 4),
        primaryDocument: r.primaryDocument[i],
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

function extractBusinessDescription(text: string): string {
  const cleaned = text.slice(0, 500_000);
  const item1 = cleaned.match(/item\s*1[\.\s]*business/i);
  const start = item1?.index ?? 0;
  const chunk = cleaned.slice(start, start + 6000);
  return chunk.slice(0, 2500).trim();
}

function extractSegmentRevenueLines(text: string): string[] {
  const lines: string[] = [];
  const segmentRe = /segment[s]?\s+(revenue|information|results)/gi;
  let m: RegExpExecArray | null;
  const cleaned = text.slice(0, 400_000);
  while ((m = segmentRe.exec(cleaned)) && lines.length < 5) {
    lines.push(cleaned.slice(m.index, m.index + 400).replace(/\s+/g, " ").trim());
  }
  return lines;
}

type CompanyFacts = {
  entityName?: string;
  facts?: {
    "us-gaap"?: Record<
      string,
      { units?: { USD?: { val: number; end: string; form: string }[] } }
    >;
  };
};

async function fetchRevenueLineItems(cik: string): Promise<RevenueLineItem[]> {
  try {
    const res = await secFetch(`${SEC_BASE}/api/xbrl/companyfacts/CIK${cik}.json`);
    const facts = (await res.json()) as CompanyFacts;
    const gaap = facts.facts?.["us-gaap"];
    const keys = ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"];
    const items: RevenueLineItem[] = [];
    for (const key of keys) {
      const usd = gaap?.[key]?.units?.USD;
      if (!usd?.length) continue;
      const latest = [...usd].sort((a, b) => (b.end > a.end ? 1 : -1))[0];
      if (latest) {
        items.push({
          label: key.replace(/([A-Z])/g, " $1").trim(),
          value: Math.round(latest.val / 1_000_000),
          period: latest.end,
          sourceSnippet: `XBRL ${key} (${latest.form}, period ${latest.end})`,
        });
      }
      if (items.length >= 3) break;
    }
    return items;
  } catch {
    return [];
  }
}

export async function fetchLatest10KFiling(ticker: string): Promise<SECFilingSource | null> {
  const lookup = await lookupCik(ticker);
  if (!lookup) return null;

  const { cik, companyName } = lookup;
  const subRes = await secFetch(`${SEC_BASE}/submissions/CIK${cik}.json`);
  const sub = (await subRes.json()) as SubmissionsResponse;
  const latest = findLatest10K(sub);
  if (!latest) return null;

  const accNoDash = latest.accessionNumber.replace(/-/g, "");
  const cikNum = cik.replace(/^0+/, "");
  const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoDash}/${latest.primaryDocument}`;

  let businessDescription = "";
  let rawText = "";
  const sourceSnippets: SourceSnippet[] = [];

  try {
    const docRes = await fetch(`${SEC_WWW}/Archives/edgar/data/${cikNum}/${accNoDash}/${latest.primaryDocument}`);
    if (docRes.ok) {
      rawText = stripHtml(await docRes.text());
      businessDescription = extractBusinessDescription(rawText);
      if (businessDescription) {
        sourceSnippets.push({
          text: businessDescription.slice(0, 500) + (businessDescription.length > 500 ? "…" : ""),
          section: "Item 1 — Business",
          filingUrl,
        });
      }
    }
  } catch {
    /* filing body optional */
  }

  const segmentRevenueText = rawText ? extractSegmentRevenueLines(rawText) : [];
  segmentRevenueText.forEach((t, i) => {
    sourceSnippets.push({
      text: t.slice(0, 400) + (t.length > 400 ? "…" : ""),
      section: `Segment disclosure ${i + 1}`,
      filingUrl,
    });
  });

  const revenueLineItems = await fetchRevenueLineItems(cik);
  revenueLineItems.forEach((r) => {
    if (r.sourceSnippet) {
      sourceSnippets.push({
        text: r.sourceSnippet,
        section: "XBRL revenue",
        filingUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-K`,
      });
    }
  });

  return {
    companyName: sub.name || companyName,
    ticker: ticker.toUpperCase(),
    cik,
    accessionNumber: latest.accessionNumber,
    formType: "10-K",
    filingDate: latest.filingDate,
    fiscalYear: latest.fiscalYear,
    filingUrl,
    businessDescription: businessDescription || undefined,
    segmentRevenueText: segmentRevenueText.length ? segmentRevenueText : undefined,
    revenueLineItems: revenueLineItems.length ? revenueLineItems : undefined,
    sourceSnippets,
  };
}

export interface EdgarSecClient {
  getLatestFiling(ticker: string): Promise<SECFilingSource | null>;
}

export const edgarSecClient: EdgarSecClient = {
  getLatestFiling: fetchLatest10KFiling,
};
