import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BoxKind = "data" | "assumption" | "calculation" | "flow";
type TierTone = "tam" | "sam" | "vended";

type ModelInputs = {
  companiesInUS: number;
  usersPerCompany: number;
  avgSpendPerSeat: number;
  logoPenetration: number;
  seatAdoptionRate: number;
};

const defaultModel: ModelInputs = {
  companiesInUS: 380000,
  usersPerCompany: 120,
  avgSpendPerSeat: 120,
  logoPenetration: 45,
  seatAdoptionRate: 58,
};

const KIND_STYLE = {
  data: { dot: "bg-blue-600", border: "border-l-blue-600", text: "text-blue-600", label: "DATA INPUT" },
  assumption: { dot: "bg-red-600", border: "border-l-red-600", text: "text-red-600", label: "ASSUMPTION" },
  calculation: { dot: "bg-green-600", border: "border-l-green-600", text: "text-green-600", label: "CALCULATION" },
  flow: { dot: "bg-blue-600", border: "border-l-blue-600", text: "text-slate-500", label: "FLOW-IN" },
} satisfies Record<BoxKind, { dot: string; border: string; text: string; label: string }>;

export default function MarketModelCanvas() {
  const [model, setModel] = useState<ModelInputs>(defaultModel);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const perCompany = model.usersPerCompany * model.avgSpendPerSeat;
    const tam = model.companiesInUS * perCompany;
    const sam = tam * (model.logoPenetration / 100);
    const vendedSam = sam * (model.seatAdoptionRate / 100);

    return {
      perCompany,
      tam,
      sam,
      vendedSam,
      samPct: tam ? (sam / tam) * 100 : 0,
      vendedPct: sam ? (vendedSam / sam) * 100 : 0,
    };
  }, [model]);

  const update = (key: keyof ModelInputs, value: string) => {
    setModel((current) => ({ ...current, [key]: parseInputNumber(value) }));
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-white">
      <TopSummaryBar
        tam={metrics.tam}
        sam={metrics.sam}
        vendedSam={metrics.vendedSam}
        samPct={metrics.samPct}
        vendedPct={metrics.vendedPct}
      />

      <main className="relative flex-1 overflow-y-auto bg-white canvas-dot-grid">
        <Legend />
        <div className="px-8 pb-10 pt-4">
          <Breadcrumb />

          <div className="space-y-3">
            <TierBand
              tone="tam"
              title="TIER 1 · TAM"
              subtitle="Total spend at full potential adoption"
              connector={<Tier1Connectors />}
            >
              <div
                className="grid items-center gap-y-8"
                style={{ gridTemplateColumns: "220px 220px 220px", columnGap: "48px" }}
              >
                <div className="row-span-2 self-center" style={{ gridColumn: 1, gridRow: "1 / span 2" }}>
                  <BoxCard
                    id="tam"
                    kind="calculation"
                    title="Total Addressable Market"
                    value={formatMarketValue(metrics.tam)}
                    formula="= # Companies × $ per Company"
                    source="Live formula output"
                    menuOpen={openMenu === "tam"}
                    onMenu={() => setOpenMenu(openMenu === "tam" ? null : "tam")}
                  />
                </div>

                <div style={{ gridColumn: 2, gridRow: 1 }}>
                  <BoxCard
                    id="companies"
                    kind="data"
                    title="# of Companies in the US"
                    value={model.companiesInUS}
                    description="By number of FTE by industry — the full universe of potential buyers."
                    source="US Census Bureau, CapIQ"
                    editable
                    onValueChange={(value) => update("companiesInUS", value)}
                    menuOpen={openMenu === "companies"}
                    onMenu={() => setOpenMenu(openMenu === "companies" ? null : "companies")}
                  />
                </div>

                <div style={{ gridColumn: 2, gridRow: 2 }}>
                  <BoxCard
                    id="per-company"
                    kind="calculation"
                    title="$ per Company"
                    value={formatCompactCurrency(metrics.perCompany)}
                    formula="= Users/Co × Spend/Seat"
                    source="Live formula output"
                    menuOpen={openMenu === "per-company"}
                    onMenu={() => setOpenMenu(openMenu === "per-company" ? null : "per-company")}
                  />
                </div>

                <div style={{ gridColumn: 3, gridRow: 1 }}>
                  <BoxCard
                    id="users"
                    kind="data"
                    title="# users per company"
                    value={model.usersPerCompany}
                    description="Average number of IAM-eligible users per company."
                    source="BLS, Expert interviews, Survey"
                    editable
                    onValueChange={(value) => update("usersPerCompany", value)}
                    menuOpen={openMenu === "users"}
                    onMenu={() => setOpenMenu(openMenu === "users" ? null : "users")}
                  />
                </div>

                <div style={{ gridColumn: 3, gridRow: 2 }}>
                  <BoxCard
                    id="spend"
                    kind="assumption"
                    title="Avg annual spend per seat"
                    value={model.avgSpendPerSeat}
                    description="Blended across governance, risk, compliance, and audit modules."
                    source="Expert interviews, Survey, Vendor data"
                    editable
                    prefix="$"
                    suffix="/yr"
                    onValueChange={(value) => update("avgSpendPerSeat", value)}
                    menuOpen={openMenu === "spend"}
                    onMenu={() => setOpenMenu(openMenu === "spend" ? null : "spend")}
                  />
                </div>
              </div>
            </TierBand>

            <FlowIndicator label={`TAM: ${formatMarketValue(metrics.tam)} flows in ↓`} />

            <TierBand
              tone="sam"
              title="TIER 2 · SAM"
              subtitle="TAM narrowed to serviceable segments"
              connector={<TwoColumnConnectors />}
            >
              <div
                className="grid items-center gap-y-8"
                style={{ gridTemplateColumns: "240px 280px", columnGap: "80px" }}
              >
                <div className="self-center" style={{ gridColumn: 1, gridRow: "1 / span 2" }}>
                  <BoxCard
                    id="sam"
                    kind="calculation"
                    title="Serviceable Addressable Market"
                    value={formatMarketValue(metrics.sam)}
                    formula="= TAM × Logo Penetration"
                    source="Live formula output"
                    menuOpen={openMenu === "sam"}
                    onMenu={() => setOpenMenu(openMenu === "sam" ? null : "sam")}
                  />
                </div>
                <div style={{ gridColumn: 2, gridRow: 1 }}>
                  <BoxCard
                    id="tam-flow"
                    kind="flow"
                    title="Total Addressable Market"
                    value={formatMarketValue(metrics.tam)}
                    description="TAM value flowing in from Tier 1 — the base before applying serviceability filters."
                    source="Upstream tier output"
                    flowFrom="from Tier 1"
                    menuOpen={openMenu === "tam-flow"}
                    onMenu={() => setOpenMenu(openMenu === "tam-flow" ? null : "tam-flow")}
                  />
                </div>
                <div style={{ gridColumn: 2, gridRow: 2 }}>
                  <BoxCard
                    id="logo-penetration"
                    kind="assumption"
                    title="Logo Penetration"
                    value={model.logoPenetration}
                    description="Share of total companies the vendor can realistically win as customers (ICP fit × geo coverage × seat relevance)."
                    source="Expert interviews, Internal benchmarks"
                    editable
                    suffix="%"
                    onValueChange={(value) => update("logoPenetration", value)}
                    menuOpen={openMenu === "logo-penetration"}
                    onMenu={() => setOpenMenu(openMenu === "logo-penetration" ? null : "logo-penetration")}
                  />
                </div>
              </div>
            </TierBand>

            <FlowIndicator label={`SAM: ${formatMarketValue(metrics.sam)} flows in ↓`} />

            <TierBand
              tone="vended"
              title="TIER 3 · VENDED SAM"
              subtitle="SAM narrowed to current vendor-captured spend"
              connector={<TwoColumnConnectors />}
            >
              <div
                className="grid items-center gap-y-8"
                style={{ gridTemplateColumns: "240px 280px", columnGap: "80px" }}
              >
                <div className="self-center" style={{ gridColumn: 1, gridRow: "1 / span 2" }}>
                  <BoxCard
                    id="vended-sam"
                    kind="calculation"
                    title="Vended SAM"
                    value={formatMarketValue(metrics.vendedSam)}
                    formula="= SAM × Adoption%"
                    source="Live formula output"
                    menuOpen={openMenu === "vended-sam"}
                    onMenu={() => setOpenMenu(openMenu === "vended-sam" ? null : "vended-sam")}
                  />
                </div>
                <div style={{ gridColumn: 2, gridRow: 1 }}>
                  <BoxCard
                    id="sam-flow"
                    kind="flow"
                    title="Serviceable Addressable Market"
                    value={formatMarketValue(metrics.sam)}
                    description="SAM value flowing in from Tier 2 — the base before applying adoption filters."
                    source="Upstream tier output"
                    flowFrom="from Tier 2"
                    menuOpen={openMenu === "sam-flow"}
                    onMenu={() => setOpenMenu(openMenu === "sam-flow" ? null : "sam-flow")}
                  />
                </div>
                <div style={{ gridColumn: 2, gridRow: 2 }}>
                  <BoxCard
                    id="seat-adoption"
                    kind="assumption"
                    title="Current Seat Adoption Rate"
                    value={model.seatAdoptionRate}
                    description="Share of serviceable seats where org is actively paying."
                    source="Expert estimates, Market revenues, Vendor data"
                    editable
                    suffix="%"
                    onValueChange={(value) => update("seatAdoptionRate", value)}
                    menuOpen={openMenu === "seat-adoption"}
                    onMenu={() => setOpenMenu(openMenu === "seat-adoption" ? null : "seat-adoption")}
                  />
                </div>
              </div>
            </TierBand>
          </div>
        </div>
      </main>
    </div>
  );
}

function Breadcrumb() {
  return (
    <div className="mb-3 text-xs font-medium text-slate-500">
      Tech <span className="mx-1 text-slate-300">&gt;</span> Software <span className="mx-1 text-slate-300">&gt;</span> Development & Deployment <span className="mx-1 text-slate-300">&gt;</span> IAM
    </div>
  );
}

function TopSummaryBar({ tam, sam, vendedSam, samPct, vendedPct }: { tam: number; sam: number; vendedSam: number; samPct: number; vendedPct: number }) {
  return (
    <div className="z-20 grid grid-cols-3 bg-[#0f172a] text-white shadow-sm">
      <MetricBlock label="TAM" value={formatMarketValue(tam)} line1="Total addressable" line2="IAM · US · 2025" />
      <MetricBlock label="SAM" value={formatMarketValue(sam)} line1="Serviceable addressable" line2={`${samPct.toFixed(1)}% of TAM`} />
      <MetricBlock label="Vended SAM" value={formatMarketValue(vendedSam)} line1="Current vended spend" line2={`${vendedPct.toFixed(1)}% of SAM`} />
    </div>
  );
}

function MetricBlock({ label, value, line1, line2 }: { label: string; value: string; line1: string; line2: string }) {
  return (
    <div className="border-r border-white/10 px-6 py-5 last:border-r-0">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white">{label}</div>
      <div className="mt-2 text-[32px] font-bold leading-none text-white">{value}</div>
      <div className="mt-2 text-[13px] leading-tight text-slate-400">{line1}</div>
      <div className="mt-1 text-xs leading-tight text-slate-500">{line2}</div>
    </div>
  );
}

function Legend() {
  return (
    <div className="absolute right-8 top-6 z-20 w-56 rounded-lg bg-white p-4 shadow-[0_1px_8px_rgba(15,23,42,0.16)]">
      <div className="mb-3 text-sm font-bold text-slate-800">Legend</div>
      <LegendRow color="bg-blue-600" label="Data input" desc="Editable. External data." />
      <LegendRow color="bg-red-600" label="Assumption" desc="Editable. Analyst judgment." />
      <LegendRow color="bg-green-600" label="Calculation" desc="Read-only. Computed." />
    </div>
  );
}

function LegendRow({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="mb-3 flex gap-2 last:mb-0">
      <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", color)} />
      <div>
        <div className="text-xs font-bold text-slate-700">{label}</div>
        <div className="text-[11px] leading-snug text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

function TierBand({ tone, title, subtitle, connector, children }: { tone: TierTone; title: string; subtitle: string; connector: React.ReactNode; children: React.ReactNode }) {
  const style = {
    tam: "border-slate-200 bg-slate-50",
    sam: "border-green-200 bg-green-50",
    vended: "border-amber-200 bg-amber-50",
  }[tone];
  const dot = {
    tam: "bg-blue-500",
    sam: "bg-green-500",
    vended: "bg-amber-500",
  }[tone];

  return (
    <section className={cn("relative rounded-xl border px-6 py-5", style)}>
      <div className="relative z-10 mb-5 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
        <span>{title}</span>
        <span className="font-normal text-slate-500">— {subtitle}</span>
      </div>
      <div className="relative">
        {connector}
        <div className="relative z-10">{children}</div>
      </div>
    </section>
  );
}

function BoxCard({
  id,
  kind,
  title,
  value,
  description,
  source,
  formula,
  editable,
  prefix,
  suffix,
  flowFrom,
  onValueChange,
  menuOpen,
  onMenu,
}: {
  id: string;
  kind: BoxKind;
  title: string;
  value: string | number;
  description?: string;
  source: string;
  formula?: string;
  editable?: boolean;
  prefix?: string;
  suffix?: string;
  flowFrom?: string;
  onValueChange?: (value: string) => void;
  menuOpen?: boolean;
  onMenu: () => void;
}) {
  const style = KIND_STYLE[kind];
  const isCalculation = kind === "calculation";
  const isFlow = kind === "flow";

  return (
    <div
      className={cn(
        "min-h-[172px] w-full rounded-[10px] border border-slate-200 border-l-4 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition hover:-translate-y-px hover:shadow-md",
        style.border,
      )}
      data-box-id={id}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase", style.text)}>
          <span className={cn("h-2 w-2 rounded-full", style.dot)} />
          {style.label}
        </div>
        <div className="flex items-center gap-3">
          {flowFrom && <span className="text-[10px] font-medium text-slate-400">{flowFrom}</span>}
          <button className="relative rounded px-1 text-slate-400 hover:bg-slate-100" onClick={onMenu} aria-label={`Open menu for ${title}`}>
            ⋮
            {menuOpen && (
              <div className="absolute right-0 top-6 z-30 w-40 rounded-md border bg-white py-1 text-left text-xs text-slate-600 shadow-lg">
                <div className="px-3 py-1.5 hover:bg-slate-50">Edit description</div>
                <div className="px-3 py-1.5 hover:bg-slate-50">Change source</div>
                <div className="px-3 py-1.5 text-red-600 hover:bg-red-50">Remove box</div>
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="mt-3 text-[15px] font-semibold leading-tight text-slate-800">{title}</div>

      <div className="mt-3">
        {editable ? (
          <div className="flex h-10 items-center rounded-md border border-slate-200 bg-white px-2">
            {prefix && <span className="text-sm font-semibold text-slate-500">{prefix}</span>}
            <Input
              value={String(value)}
              onChange={(event) => onValueChange?.(event.target.value)}
              className="h-9 border-0 bg-transparent px-1 text-left text-lg font-semibold text-slate-900 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {suffix && <span className="text-xs font-medium text-slate-500">{suffix}</span>}
          </div>
        ) : (
          <div className={cn("text-2xl font-bold leading-tight", isCalculation ? "text-green-600" : "text-slate-900")}>{value}</div>
        )}
      </div>

      {formula && <div className="mt-2 text-xs leading-snug text-slate-500">{formula}</div>}
      {description && <div className="mt-3 text-xs leading-snug text-slate-500">{description}</div>}
      <div className={cn("mt-2 text-xs italic text-slate-400", isFlow && "mt-3")}>Source: {source}</div>
    </div>
  );
}

function Tier1Connectors() {
  return (
    <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
      <BranchConnector
        parentRightX={220}
        trunkX={244}
        childLeftX={268}
        parentY={188}
        childYs={[86, 290]}
      />
      <BranchConnector
        parentRightX={488}
        trunkX={512}
        childLeftX={536}
        parentY={290}
        childYs={[86, 290]}
      />
    </svg>
  );
}

function TwoColumnConnectors() {
  return (
    <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
      <BranchConnector
        parentRightX={240}
        trunkX={280}
        childLeftX={320}
        parentY={188}
        childYs={[86, 290]}
      />
    </svg>
  );
}

function BranchConnector({
  parentRightX,
  trunkX,
  childLeftX,
  parentY,
  childYs,
}: {
  parentRightX: number;
  trunkX: number;
  childLeftX: number;
  parentY: number;
  childYs: number[];
}) {
  const minY = Math.min(parentY, ...childYs);
  const maxY = Math.max(parentY, ...childYs);

  return (
    <g>
      <path
        d={`M ${parentRightX} ${parentY} H ${trunkX} V ${minY} M ${trunkX} ${parentY} V ${maxY}`}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {childYs.map((childY) => (
        <path
          key={childY}
          d={`M ${trunkX} ${childY} H ${childLeftX}`}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <OperatorBadge x={trunkX} y={parentY} />
    </g>
  );
}

function OperatorBadge({ x, y, symbol = "×" }: { x: number; y: number; symbol?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="14" fill="#1e293b" filter="drop-shadow(0 1px 4px rgba(0,0,0,0.15))" />
      <text x={x} y={y} dy="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">
        {symbol}
      </text>
    </g>
  );
}

function FlowIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pl-24 text-[10px] font-semibold text-slate-500">
      <span className="h-4 border-l-2 border-dashed border-slate-400" />
      <span>{label}</span>
    </div>
  );
}

function parseInputNumber(value: string) {
  const parsed = Number(value.replace(/[$,%\s/yr]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMarketValue(value: number) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
