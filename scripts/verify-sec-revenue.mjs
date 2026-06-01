/**
 * Verify annual revenue extraction for tickers (requires npm run dev).
 * Usage: node scripts/verify-sec-revenue.mjs
 * Env: SEC_VERIFY_BASE, SEC_VERIFY_TICKERS=ZS,CRWD
 */
const BASE = process.env.SEC_VERIFY_BASE ?? "http://127.0.0.1:8080";
const TICKERS = (process.env.SEC_VERIFY_TICKERS ?? "ZS,CRWD").split(",").map((t) => t.trim());

const REVENUE_XBRL_KEYS = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
  "SalesRevenueNet",
  "Revenues",
];
const QUARTERLY_FP = new Set(["Q1", "Q2", "Q3", "Q4"]);

function pickLatestFyAnnualFact(usd, allowQuarterly) {
  let pool = usd.filter((u) => u.val > 0 && u.form === "10-K");
  if (!pool.length && allowQuarterly) pool = usd.filter((u) => u.val > 0 && u.form === "10-Q");
  if (!pool.length) return null;
  const fyRows = pool.filter((u) => u.fp === "FY");
  const nonQuarterlyFp = pool.filter((u) => !u.fp || !QUARTERLY_FP.has(u.fp));
  const work = fyRows.length ? fyRows : nonQuarterlyFp;
  const byEnd = new Map();
  for (const row of work) {
    const prev = byEnd.get(row.end);
    if (!prev || row.val > prev.val) byEnd.set(row.end, row);
  }
  const latestEnd = [...byEnd.keys()].sort((a, b) => b.localeCompare(a))[0];
  return latestEnd ? byEnd.get(latestEnd) : null;
}

function extractRevenueM(gaap) {
  let best = null;
  const keys = [
    ...REVENUE_XBRL_KEYS,
    ...Object.keys(gaap).filter(
      (k) =>
        /^RevenueFromContractWithCustomer/i.test(k) &&
        !/Liability|Remaining|Deferred|Recognized/i.test(k),
    ),
  ];
  for (const key of keys) {
    const usd = gaap[key]?.units?.USD;
    if (!usd?.length) continue;
    const latest = pickLatestFyAnnualFact(usd, false);
    if (!latest) continue;
    const valueM = Math.round(latest.val / 1_000_000);
    const candidate = { key, latest, valueM };
    if (!best || latest.end > best.latest.end) best = candidate;
  }
  return best;
}

const EXPECTED = {
  ZS: { minM: 2000, maxM: 3000 },
  CRWD: { minM: 4000, maxM: 6000 },
};

async function main() {
  console.log("SEC revenue verify —", BASE);
  let ok = true;
  for (const ticker of TICKERS) {
    const sym = ticker.toUpperCase();
    const index = await fetch(`${BASE}/api/sec-www/files/company_tickers.json`).then((r) => r.json());
    const row = Object.values(index).find((e) => e.ticker?.toUpperCase() === sym);
    if (!row) {
      console.log(`${sym}: ticker not found`);
      ok = false;
      continue;
    }
    const cik = String(row.cik_str).padStart(10, "0");
    const facts = await fetch(`${BASE}/api/sec/api/xbrl/companyfacts/CIK${cik}.json`).then((r) => r.json());
    const gaap = facts.facts?.["us-gaap"];
    const hit = extractRevenueM(gaap);
    const exp = EXPECTED[sym];
    const inRange = hit && exp && hit.valueM >= exp.minM && hit.valueM <= exp.maxM;
    console.log(
      `${sym}: ${hit ? `$${hit.valueM}M` : "NO REVENUE"} tag=${hit?.key ?? "—"} end=${hit?.latest?.end ?? "—"} form=${hit?.latest?.form ?? "—"} fp=${hit?.latest?.fp ?? "—"} ${inRange ? "OK" : "FAIL"}`,
    );
    if (!inRange) ok = false;
  }
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
