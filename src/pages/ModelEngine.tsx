import { useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { useModel } from "@/store/ModelStore";
import { Plus, Trash2, Edit3, ChevronRight } from "lucide-react";
import { IssueNode } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function ModelEngine() {
  const { tree, market } = useModel();
  const [companies, setCompanies] = useState("380,000");
  const [usersPerCompany, setUsersPerCompany] = useState("120");
  const [spendPerSeat, setSpendPerSeat] = useState("120");
  const [serviceableCompanies, setServiceableCompanies] = useState("65");
  const [seatAdoption, setSeatAdoption] = useState("45");
  const [linkedInputsOpen, setLinkedInputsOpen] = useState({ tam: false, sam: false, vendedSam: false });
  const [showLinkages, setShowLinkages] = useState(true);
  const [pulseTam, setPulseTam] = useState(false);

  const companiesValue = parseEditableNumber(companies);
  const usersValue = parseEditableNumber(usersPerCompany);
  const spendValue = parseEditableNumber(spendPerSeat);
  const serviceableCompaniesValue = parseEditableNumber(serviceableCompanies);
  const seatAdoptionValue = parseEditableNumber(seatAdoption);
  const tamDollars = companiesValue * usersValue * spendValue;
  const samDollars = tamDollars * (serviceableCompaniesValue / 100);
  const vendedSamDollars = samDollars * (seatAdoptionValue / 100);

  useEffect(() => {
    setPulseTam(true);
    const timeout = window.setTimeout(() => setPulseTam(false), 500);
    return () => window.clearTimeout(timeout);
  }, [tamDollars]);

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-12 gap-0 flex-1 min-h-0">
        {/* Left Panel: Issue Tree */}
        <div className="col-span-3 border-r bg-card overflow-y-auto">
          <PanelHeader title="Issue Tree" actions={<><IconBtn icon={Plus} /><IconBtn icon={Edit3} /><IconBtn icon={Trash2} /></>} />
          <div className="p-4">
            <TreeView node={tree} depth={0} />
          </div>
        </div>

        {/* Center Canvas */}
        <div className="col-span-9 overflow-y-auto bg-surface-muted">
          <div className="p-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="mds-eyebrow mb-1">Step 3 · Modeling</div>
                <h1 className="text-[22px] font-semibold text-slate-900">Market Model Engine</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {market.name} · IAM · US · {market.timeframe}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    showLinkages ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  onClick={() => setShowLinkages((visible) => !visible)}
                >
                  {showLinkages ? "Hide linkages" : "Show linkages"}
                </button>
                <Legend />
              </div>
            </div>

            <div className="relative space-y-3 rounded-xl border bg-white/50 p-5 shadow-sm mds-grid-bg">
              {showLinkages && <CanvasLinkages />}
              <FormulaTier
                title="TAM — Total Addressable Market"
                subtitle="Total spend on all addressable IAM seats at full potential adoption"
              >
                <FormulaCell
                  type="data"
                  title="Companies in the US, #"
                  value={companies}
                  onChange={setCompanies}
                  onCommit={() => setCompanies(formatNumber(companiesValue))}
                  description="By number of FTE by industry."
                  source="US Census Bureau, CapIQ"
                />
                <Operator symbol="×" />
                <FormulaCell
                  type="data"
                  title="# users per company"
                  value={usersPerCompany}
                  onChange={setUsersPerCompany}
                  onCommit={() => setUsersPerCompany(formatNumber(usersValue))}
                  description="Number of users per company."
                  source="BLS, Expert interviews, Survey"
                />
                <Operator symbol="×" />
                <FormulaCell
                  type="assumption"
                  title="Avg annual spend per seat"
                  value={spendPerSeat}
                  onChange={setSpendPerSeat}
                  onCommit={() => setSpendPerSeat(formatNumber(spendValue))}
                  description="Average annual spend per seat by sub-domain."
                  source="Expert interviews, Survey, Vendor data"
                  prefix="$"
                  suffix="/yr"
                />
                <Operator symbol="=" />
                <FormulaCell
                  type="calculation"
                  title="Total Addressable Market"
                  value={formatCurrencyB(tamDollars)}
                  description="Calculated total spend from companies, users, and annual spend per seat."
                  source="Live formula output"
                  formulaLine="= Companies × Users × Spend"
                  pulse={pulseTam}
                  expanded={linkedInputsOpen.tam}
                  onToggleExpanded={() => setLinkedInputsOpen((open) => ({ ...open, tam: !open.tam }))}
                  linkedInputs={[
                    { type: "data", label: "Companies in US", value: formatNumber(companiesValue) },
                    { type: "data", label: "Users per company", value: formatNumber(usersValue) },
                    { type: "assumption", label: "Spend per seat", value: `$${formatNumber(spendValue)}/yr` },
                  ]}
                />
              </FormulaTier>

              <FormulaTier
                title="SAM — Serviceable Addressable Market"
                subtitle="Total spend on core sub-domains in core customer segments at current logo penetration"
              >
                <FormulaCell
                  type="calculation"
                  title="TAM Result"
                  value={formatCurrencyB(tamDollars)}
                  description="Mirrors the TAM calculation above."
                  source="TAM output"
                  formulaLine="= TAM"
                />
                <Operator symbol="×" />
                <FormulaCell
                  type="assumption"
                  title="% Serviceable Companies"
                  value={serviceableCompanies}
                  onChange={setServiceableCompanies}
                  onCommit={() => setServiceableCompanies(formatNumber(serviceableCompaniesValue))}
                  suffix="%"
                  description="Excluding companies in irrelevant size bands, unpenetrated companies."
                  source="Expert interviews, Survey"
                />
                <Operator symbol="=" />
                <FormulaCell
                  type="calculation"
                  title="Serviceable Addressable Market"
                  value={formatCurrencyB(samDollars)}
                  description="Calculated from TAM and serviceable company coverage."
                  source="Live formula output"
                  formulaLine="= TAM × Serviceable %"
                  pulse={pulseTam}
                  expanded={linkedInputsOpen.sam}
                  onToggleExpanded={() => setLinkedInputsOpen((open) => ({ ...open, sam: !open.sam }))}
                  linkedInputs={[
                    { type: "calculation", label: "TAM", value: formatCurrencyB(tamDollars) },
                    { type: "assumption", label: "Serviceable companies", value: `${formatNumber(serviceableCompaniesValue)}%` },
                  ]}
                />
              </FormulaTier>

              <FormulaTier
                title="Vended SAM"
                subtitle="Current spend on core sub-domains at current seat adoption"
              >
                <FormulaCell
                  type="calculation"
                  title="SAM Result"
                  value={formatCurrencyB(samDollars)}
                  description="Mirrors the SAM calculation above."
                  source="SAM output"
                  formulaLine="= SAM"
                />
                <Operator symbol="×" />
                <FormulaCell
                  type="assumption"
                  title="Seat Adoption Rate"
                  value={seatAdoption}
                  onChange={setSeatAdoption}
                  onCommit={() => setSeatAdoption(formatNumber(seatAdoptionValue))}
                  suffix="%"
                  description="Excluding potential spend not currently adopted based on seats and use cases."
                  source="Expert estimates, Market revenues, Vendor data"
                />
                <Operator symbol="=" />
                <FormulaCell
                  type="calculation"
                  title="Vended SAM"
                  value={formatCurrencyB(vendedSamDollars)}
                  description="Calculated current vended market spend."
                  source="Live formula output"
                  formulaLine="= SAM × Adoption"
                  pulse={pulseTam}
                  expanded={linkedInputsOpen.vendedSam}
                  onToggleExpanded={() => setLinkedInputsOpen((open) => ({ ...open, vendedSam: !open.vendedSam }))}
                  linkedInputs={[
                    { type: "calculation", label: "SAM", value: formatCurrencyB(samDollars) },
                    { type: "assumption", label: "Seat adoption", value: `${formatNumber(seatAdoptionValue)}%` },
                  ]}
                />
              </FormulaTier>

              <SummaryBar tam={formatCurrencyB(tamDollars)} sam={formatCurrencyB(samDollars)} vendedSam={formatCurrencyB(vendedSamDollars)} timeframe={market.timeframe} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ title, sub, actions }: any) {
  return (
    <div className="px-5 py-3 border-b flex items-center justify-between bg-card sticky top-0 z-10">
      <div>
        <h3 className="text-sm font-semibold text-mds-navy">{title}</h3>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </div>
      {actions && <div className="flex gap-1">{actions}</div>}
    </div>
  );
}
function IconBtn({ icon: Icon }: any) {
  return <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><Icon className="h-3.5 w-3.5" /></button>;
}

function TreeView({ node, depth, activeBranch = false, disabledBranch = false }: { node: IssueNode; depth: number; activeBranch?: boolean; disabledBranch?: boolean }) {
  const isRoot = depth === 0;
  const isIam = node.label === "IAM";
  const branchActive = activeBranch || isIam;
  const disabled = !isRoot && !branchActive && (disabledBranch || node.children?.length);
  const children = getTreeChildren(node, isRoot);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1 text-sm rounded px-1",
          isIam && "bg-blue-50 text-blue-600 font-medium",
          disabled && "opacity-35 cursor-not-allowed",
        )}
        style={{ paddingLeft: depth * 12 }}
        title={disabled ? "Coming soon" : undefined}
      >
        {children?.length ? <ChevronRight className="h-3 w-3 text-muted-foreground rotate-90" /> : <span className="w-3" />}
        <span className={isRoot ? "font-semibold text-mds-navy" : branchActive ? "text-inherit" : "text-foreground"}>{node.label}</span>
      </div>
      {children?.map((c) => <TreeView key={c.id} node={c} depth={depth + 1} activeBranch={branchActive} disabledBranch={disabled} />)}
    </div>
  );
}

function getTreeChildren(node: IssueNode, isRoot: boolean) {
  if (!isRoot) return node.children;
  const children = node.children ?? [];
  if (children.some((child) => child.label === "Network Security")) return children;
  return [...children, { id: "s4", label: "Network Security", children: [{ id: "v5n", label: "Fortinet" }] }];
}

function CanvasLinkages() {
  return (
    <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden="true">
      <defs>
        <marker id="canvas-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#64748B" />
        </marker>
      </defs>
      <path
        d="M 930 185 C 1020 185, 1020 250, 118 250 L 118 326"
        fill="none"
        stroke="#64748B"
        strokeWidth="2"
        strokeDasharray="7 6"
        strokeLinecap="round"
        markerEnd="url(#canvas-arrow)"
      />
      <path
        d="M 930 452 C 1020 452, 1020 520, 118 520 L 118 594"
        fill="none"
        stroke="#64748B"
        strokeWidth="2"
        strokeDasharray="7 6"
        strokeLinecap="round"
        markerEnd="url(#canvas-arrow)"
      />
    </svg>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500" aria-label="Color coding">
      <LegendItem color="bg-blue-600" />
      <LegendItem color="bg-red-600" />
      <LegendItem color="bg-green-600" />
    </div>
  );
}

function LegendItem({ color }: { color: string }) {
  return (
    <span className={cn("inline-block h-2.5 w-2.5 rounded-full shadow-sm", color)} />
  );
}

function FormulaTier({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="relative z-10 rounded-lg border bg-card/95 p-5 shadow-sm backdrop-blur-sm">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex min-w-[920px] items-stretch gap-0 overflow-x-auto pb-1">
        {children}
      </div>
    </section>
  );
}

function Operator({ symbol }: { symbol: "×" | "=" }) {
  return (
    <div className="flex w-14 items-center justify-center">
      <span className="h-px flex-1 bg-slate-300" />
      <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-800 text-sm font-bold text-white shadow-sm">
        {symbol}
      </div>
      <span className="h-px flex-1 bg-slate-300" />
    </div>
  );
}

type FormulaCellType = "data" | "assumption" | "calculation";

function FormulaCell({
  type,
  title,
  value,
  onChange,
  onCommit,
  description,
  source,
  prefix,
  suffix,
  formulaLine,
  pulse,
  expanded,
  onToggleExpanded,
  linkedInputs,
}: {
  type: FormulaCellType;
  title: string;
  value: string;
  onChange?: (value: string) => void;
  onCommit?: () => void;
  description: string;
  source: string;
  prefix?: string;
  suffix?: string;
  formulaLine?: string;
  pulse?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  linkedInputs?: { type: FormulaCellType; label: string; value: string }[];
}) {
  const style = CELL_STYLES[type];
  const editable = type !== "calculation" && onChange;
  const width = type === "calculation" ? "w-[260px]" : "w-[220px]";

  return (
    <div className={cn("shrink-0 rounded-lg border border-slate-200 border-l-4 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]", style.border, type === "calculation" && "bg-green-50", width)}>
      <div>
        <span className={cn("inline-block h-2.5 w-2.5 rounded-full", style.dot)} />
      </div>
      <div className="mt-4 text-[13px] font-semibold text-slate-800">{title}</div>

      <div className="mt-3">
        {editable ? (
          <div className="flex items-center rounded-md border bg-white px-2">
            {prefix && <span className="text-sm font-semibold text-slate-500">{prefix}</span>}
            <Input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onBlur={onCommit}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className={cn("h-10 border-0 bg-transparent px-1 text-right text-lg font-bold tabular-nums shadow-none focus-visible:ring-2 focus-visible:ring-offset-0", style.ring)}
            />
            {suffix && <span className="text-xs font-medium text-slate-500">{suffix}</span>}
          </div>
        ) : (
          <div className={cn("rounded-md bg-white px-3 py-2 text-[22px] font-bold tabular-nums text-slate-900 transition-all", pulse && "ring-2 ring-green-400")}>
            {value}
          </div>
        )}
      </div>

      {formulaLine && <div className="mt-3 rounded bg-green-100 px-2 py-1 font-mono text-[11px] text-green-800">{formulaLine}</div>}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{description}</p>
      <p className="mt-2 text-[10px] italic text-slate-400">Source: {source}</p>

      {onToggleExpanded && (
        <button className="mt-3 text-[11px] font-medium text-green-700" onClick={onToggleExpanded}>
          {expanded ? "▲ Hide linked cells" : "▼ View linked cells"}
        </button>
      )}
      {expanded && linkedInputs && (
        <div className="mt-3 border-t pt-3">
          {linkedInputs.map((input) => (
            <div key={input.label} className="flex items-center justify-between gap-3 py-1 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <span className={cn("h-2 w-2 rounded-full", CELL_STYLES[input.type].dot)} />
                {input.label}
              </span>
              <span className="font-semibold tabular-nums text-slate-800">{input.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CELL_STYLES = {
  data: { border: "border-l-blue-600", dot: "bg-blue-600", ring: "focus-visible:ring-blue-500" },
  assumption: { border: "border-l-red-600", dot: "bg-red-600", ring: "focus-visible:ring-red-500" },
  calculation: { border: "border-l-green-600", dot: "bg-green-600", ring: "focus-visible:ring-green-500" },
} satisfies Record<FormulaCellType, { border: string; dot: string; ring: string }>;

function SummaryBar({ tam, sam, vendedSam, timeframe }: { tam: string; sam: string; vendedSam: string; timeframe: string }) {
  return (
    <div className="relative z-10 rounded-lg border bg-slate-900 text-white shadow-sm">
      <div className="grid divide-y divide-white/10 md:grid-cols-[1fr_1fr_1fr_120px] md:divide-x md:divide-y-0">
        <SummaryColumn label="TAM" value={tam} detail={`IAM · US · ${timeframe}`} active />
        <SummaryColumn label="SAM" value={sam} detail="65% serviceable" active />
        <SummaryColumn label="Vended SAM" value={vendedSam} detail="45% adoption" active />
        <SummaryColumn label="Recalc" value="LIVE" detail="5 cells" active />
      </div>
    </div>
  );
}

function SummaryColumn({ label, value, detail, active, muted }: { label: string; value: string; detail: string; active?: boolean; muted?: boolean }) {
  return (
    <div className={cn("p-4", muted && "opacity-35")}>
      <div className={cn("text-xs uppercase tracking-[0.12em] text-white/60", active && "text-green-300")}>{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-white/60">{detail}</div>
    </div>
  );
}

function parseEditableNumber(value: string) {
  const parsed = Number(value.replace(/[$,\s/yr]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: value % 1 === 0 ? 0 : 1 });
}

function formatCurrencyB(value: number) {
  return `$${(value / 1_000_000_000).toFixed(2)}B`;
}
