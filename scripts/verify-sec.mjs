/**
 * End-to-end SEC check via Vite dev proxy (run: npm run dev, then node scripts/verify-sec.mjs)
 */
const BASE = process.env.SEC_VERIFY_BASE ?? "http://127.0.0.1:8080";
const TICKERS = (process.env.SEC_VERIFY_TICKERS ?? "MSFT,CRWD").split(",").map((t) => t.trim());

const email = process.env.SEC_CONTACT_EMAIL?.trim() || "smme-hackathon@example.com";
const UA = `SMME-MarketModel-Engine ${email}`;

async function get(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  return { url, status: res.status, ok: res.ok, body: res.ok ? await res.json().catch(() => null) : await res.text() };
}

async function verifyTicker(ticker) {
  const sym = ticker.toUpperCase();
  console.log(`\n=== ${sym} ===`);

  const index = await get("/api/sec-www/files/company_tickers.json");
  console.log("1. company_tickers:", index.status, index.ok ? "OK" : index.body?.slice?.(0, 80));
  if (!index.ok) return false;

  const entries = Object.values(index.body);
  const row = entries.find((e) => e.ticker?.toUpperCase() === sym);
  if (!row) {
    console.log("2. CIK lookup: NOT FOUND");
    return false;
  }
  const cik = String(row.cik_str).padStart(10, "0");
  console.log("2. CIK lookup:", cik, row.title);

  const sub = await get(`/api/sec/submissions/CIK${cik}.json`);
  console.log("3. submissions:", sub.status, sub.ok ? sub.body?.name : sub.body?.slice?.(0, 80));
  if (!sub.ok) return false;

  const forms = sub.body?.filings?.recent?.form ?? [];
  const form10k = forms.indexOf("10-K");
  const form = form10k >= 0 ? "10-K" : forms.includes("10-Q") ? "10-Q" : null;
  const i = form === "10-K" ? form10k : forms.indexOf("10-Q");
  const filingDate = i >= 0 ? sub.body.filings.recent.filingDate[i] : "—";
  const accession = i >= 0 ? sub.body.filings.recent.accessionNumber[i] : "—";
  console.log("4. filing_discovery:", form ?? "NONE", filingDate, accession);

  const facts = await get(`/api/sec/api/xbrl/companyfacts/CIK${cik}.json`);
  console.log("5. revenue_xbrl:", facts.status, facts.ok ? facts.body?.entityName : facts.body?.slice?.(0, 80));

  return index.ok && sub.ok && facts.ok;
}

console.log("SEC verify — proxy base:", BASE);
console.log("User-Agent (proxy):", UA);

let ok = true;
for (const t of TICKERS) {
  if (!(await verifyTicker(t))) ok = false;
}
process.exit(ok ? 0 : 1);
