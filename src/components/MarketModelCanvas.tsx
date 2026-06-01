import { useMemo, useState } from "react";
import { MoreVertical, Plus, Trash2, X } from "lucide-react";
import ExcelJS from "exceljs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useModel } from "@/store/ModelStore";
import type { Vendor } from "@/lib/mockData";

type NodeKind = "data" | "assumption" | "calculation" | "flow";
type Operator = "×" | "÷" | "+" | "−" | "=";
type Unit = "%" | "$" | "count" | "ratio" | "$/yr";

type ModelNode = {
  id: string;
  parentId?: string;
  kind: NodeKind;
  title: string;
  operator: Operator;
  value: number;
  unit: Unit;
  description: string;
  source: string;
  order: number;
  editableValue?: boolean;
  protected?: boolean;
  tier: "tam" | "sam" | "vended";
};

type NodeDraft = Pick<ModelNode, "title" | "kind" | "operator" | "value" | "unit" | "description" | "source">;

type TreeItem = {
  node: ModelNode;
  children: TreeItem[];
  depth: number;
};

type LayoutItem = TreeItem & {
  x: number;
  y: number;
  width: number;
  height: number;
  subtreeHeight: number;
  children: LayoutItem[];
};

type TreeLayout = {
  items: LayoutItem[];
  width: number;
  height: number;
};

type MetricValues = Record<string, number>;

type ValidationCheck = {
  name: string;
  passed: boolean;
  details: string[];
};

type ValidationReport = {
  checks: ValidationCheck[];
  missingAssumptions: string[];
  unresolvedCalculations: string[];
  circularReferences: string[];
  emptyVendorFields: string[];
  emptySources: string[];
  canExport: boolean;
};

const NODE_WIDTH = 280;
const NODE_HEIGHT = 240;
const COLUMN_GAP = 120;
const SIBLING_GAP = 24;
const OPERATORS: Operator[] = ["×", "÷", "+", "−", "="];
const UNITS: Unit[] = ["%", "$", "count", "ratio", "$/yr"];
const US_TOTAL_FIRMS = 6_395_635;
const SEATS_PER_COMPANY = 21.22516481944326;
const CENSUS_TOTAL_FIRMS_FILTER = "U.S. total Firms: State = 0, all industries, enterprise size '01: Total'";

const KIND_STYLE = {
  data: {
    dot: "bg-mds-blue",
    border: "border-l-mds-blue",
    text: "text-mds-blue",
    label: "DATA INPUT",
  },
  assumption: {
    dot: "bg-destructive",
    border: "border-l-destructive",
    text: "text-destructive",
    label: "ASSUMPTION",
  },
  calculation: {
    dot: "bg-mds-success",
    border: "border-l-mds-success",
    text: "text-mds-success",
    label: "CALCULATION",
  },
  flow: {
    dot: "bg-mds-neutral",
    border: "border-l-mds-neutral",
    text: "text-muted-foreground",
    label: "FLOW-IN",
  },
} satisfies Record<NodeKind, { dot: string; border: string; text: string; label: string }>;

const INITIAL_NODES: ModelNode[] = [
  {
    id: "tam",
    kind: "calculation",
    title: "Total Addressable Market",
    operator: "=",
    value: 0,
    unit: "$",
    description: "Total market spend at full potential adoption.",
    source: "Live formula output",
    order: 0,
    protected: true,
    tier: "tam",
  },
  {
    id: "companies",
    parentId: "tam",
    kind: "data",
    title: "# of Companies in the US",
    operator: "×",
    value: US_TOTAL_FIRMS,
    unit: "count",
    description: CENSUS_TOTAL_FIRMS_FILTER,
    source: "Hackathon_Model_Template.xlsx · Assumptions!C7",
    order: 0,
    editableValue: true,
    protected: true,
    tier: "tam",
  },
  {
    id: "per-company",
    parentId: "tam",
    kind: "calculation",
    title: "$ per Company",
    operator: "×",
    value: 0,
    unit: "$",
    description: "Annual spend per company on IAM software.",
    source: "Live formula output",
    order: 1,
    protected: true,
    tier: "tam",
  },
  {
    id: "users",
    parentId: "per-company",
    kind: "data",
    title: "# users per company",
    operator: "×",
    value: SEATS_PER_COMPANY,
    unit: "count",
    description: "Seats per company = U.S. total Employment / Number of companies.",
    source: "Hackathon_Model_Template.xlsx · Assumptions!C8",
    order: 0,
    editableValue: true,
    protected: true,
    tier: "tam",
  },
  {
    id: "spend",
    parentId: "per-company",
    kind: "assumption",
    title: "Avg annual spend per seat",
    operator: "×",
    value: 120,
    unit: "$/yr",
    description: "Blended across governance, risk, compliance, and audit modules.",
    source: "Expert interviews, Survey, Vendor data",
    order: 1,
    editableValue: true,
    protected: true,
    tier: "tam",
  },
  {
    id: "sam",
    kind: "calculation",
    title: "Serviceable Addressable Market",
    operator: "=",
    value: 0,
    unit: "$",
    description: "TAM narrowed to serviceable segments.",
    source: "Live formula output",
    order: 0,
    protected: true,
    tier: "sam",
  },
  {
    id: "tam-flow",
    parentId: "sam",
    kind: "flow",
    title: "Total Addressable Market",
    operator: "×",
    value: 0,
    unit: "$",
    description: "TAM value flowing in from Tier 1.",
    source: "Upstream tier output",
    order: 0,
    protected: true,
    tier: "sam",
  },
  {
    id: "logo-penetration",
    parentId: "sam",
    kind: "assumption",
    title: "Logo Penetration",
    operator: "×",
    value: 45,
    unit: "%",
    description: "Share of total companies the vendor can realistically win as customers.",
    source: "Expert interviews, Internal benchmarks",
    order: 1,
    editableValue: true,
    protected: true,
    tier: "sam",
  },
  {
    id: "vended-sam",
    kind: "calculation",
    title: "Vended SAM",
    operator: "=",
    value: 0,
    unit: "$",
    description: "SAM narrowed to current vendor-captured spend.",
    source: "Live formula output",
    order: 0,
    protected: true,
    tier: "vended",
  },
  {
    id: "sam-flow",
    parentId: "vended-sam",
    kind: "flow",
    title: "Serviceable Addressable Market",
    operator: "×",
    value: 0,
    unit: "$",
    description: "SAM value flowing in from Tier 2.",
    source: "Upstream tier output",
    order: 0,
    protected: true,
    tier: "vended",
  },
  {
    id: "seat-adoption",
    parentId: "vended-sam",
    kind: "assumption",
    title: "Current Seat Adoption Rate",
    operator: "×",
    value: 58,
    unit: "%",
    description: "Share of serviceable seats where organizations are actively paying.",
    source: "Expert estimates, Market revenues, Vendor data",
    order: 1,
    editableValue: true,
    protected: true,
    tier: "vended",
  },
];

export default function MarketModelCanvas() {
  const { vendors } = useModel();
  const [nodes, setNodes] = useState<ModelNode[]>(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [draftParentId, setDraftParentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NodeDraft>(createDraft());
  const [saveError, setSaveError] = useState("");
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);

  const values = useMemo(() => calculateValues(nodes), [nodes]);
  const selectedNode = selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) : undefined;
  const tam = values.tam ?? 0;
  const sam = values.sam ?? 0;
  const vendedSam = values["vended-sam"] ?? 0;

  const updateNode = (id: string, updates: Partial<ModelNode>) => {
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, ...updates } : node)));
  };

  const startAddDriver = (parentId: string) => {
    const parent = nodes.find((node) => node.id === parentId);
    setDraftParentId(parentId);
    setSelectedNodeId(parentId);
    setDraft(createDraft(parent));
    setSaveError("");
    setOpenMenuId(null);
  };

  const saveDriver = () => {
    if (draft.value === 0) {
      setSaveError("Value cannot be zero.");
      return;
    }

    const parent = nodes.find((node) => node.id === draftParentId);
    if (!parent || !draftParentId) return;

    const siblingCount = nodes.filter((node) => node.parentId === draftParentId).length;
    const id = `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "driver"}-${Date.now()}`;
    const nextNode: ModelNode = {
      id,
      parentId: draftParentId,
      kind: draft.kind,
      title: draft.title.trim() || "New Driver",
      operator: draft.operator,
      value: draft.value,
      unit: draft.unit,
      description: draft.description,
      source: draft.source,
      order: siblingCount,
      editableValue: true,
      tier: parent.tier,
    };

    setNodes((current) => [...current, nextNode]);
    setSelectedNodeId(id);
    setDraftParentId(null);
    setSaveError("");
  };

  const deleteNode = (id: string) => {
    const node = nodes.find((item) => item.id === id);
    if (!node || node.protected) return;
    const idsToDelete = getDescendantIds(nodes, id);
    setNodes((current) => current.filter((item) => item.id !== id && !idsToDelete.includes(item.id)));
    setSelectedNodeId(node.parentId ?? "tam");
    setOpenMenuId(null);
  };

  const openExportReport = () => {
    setValidationReport(validateExport(nodes, values, vendors));
  };

  const exportWorkbook = async () => {
    try {
      await exportMarketModelWorkbook(nodes, values, vendors);
      setValidationReport(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Excel export failed.");
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-background text-foreground">
      <TopSummaryBar tam={tam} sam={sam} vendedSam={vendedSam} onExport={openExportReport} />

      <main className="relative min-h-0 min-w-0 flex-1 overflow-auto bg-background canvas-dot-grid">
        <Legend />
        <div className="min-w-[980px] px-8 pb-10 pt-4 pr-64">
          <Breadcrumb />
          <div className="space-y-3">
            <TierBand
              tone="tam"
              title="TIER 1 · TAM"
              subtitle="Total spend at full potential adoption"
              rootId="tam"
              nodes={nodes}
              values={values}
              selectedNodeId={selectedNodeId}
              openMenuId={openMenuId}
              onSelect={setSelectedNodeId}
              onMenu={setOpenMenuId}
              onAddDriver={startAddDriver}
              onDelete={deleteNode}
              onValueChange={(id, value) => updateNode(id, { value: parseInputNumber(value) })}
            />

            <CrossTierFlowLink label={`TAM: ${formatMarketValue(tam)} flows to Tier 2`} />

            <TierBand
              tone="sam"
              title="TIER 2 · SAM"
              subtitle="TAM narrowed to serviceable segments"
              rootId="sam"
              nodes={nodes}
              values={values}
              selectedNodeId={selectedNodeId}
              openMenuId={openMenuId}
              onSelect={setSelectedNodeId}
              onMenu={setOpenMenuId}
              onAddDriver={startAddDriver}
              onDelete={deleteNode}
              onValueChange={(id, value) => updateNode(id, { value: parseInputNumber(value) })}
            />

            <CrossTierFlowLink label={`SAM: ${formatMarketValue(sam)} flows to Tier 3`} />

            <TierBand
              tone="vended"
              title="TIER 3 · VENDED SAM"
              subtitle="SAM narrowed to current vendor-captured spend"
              rootId="vended-sam"
              nodes={nodes}
              values={values}
              selectedNodeId={selectedNodeId}
              openMenuId={openMenuId}
              onSelect={setSelectedNodeId}
              onMenu={setOpenMenuId}
              onAddDriver={startAddDriver}
              onDelete={deleteNode}
              onValueChange={(id, value) => updateNode(id, { value: parseInputNumber(value) })}
            />
          </div>
        </div>
      </main>

      {(draftParentId || selectedNode) && (
        <ConfigurationPanel
          node={selectedNode ?? nodes.find((node) => node.id === draftParentId) ?? nodes[0]}
          value={selectedNode ? values[selectedNode.id] ?? selectedNode.value : 0}
          isAdding={Boolean(draftParentId)}
          draft={draft}
          saveError={saveError}
          onDraftChange={(updates) => {
            setDraft((current) => ({ ...current, ...updates }));
            if (updates.value !== 0) setSaveError("");
          }}
          onSaveDriver={saveDriver}
          onCancelDriver={() => {
            setSelectedNodeId(null);
            setDraftParentId(null);
            setSaveError("");
          }}
          onUpdateNode={updateNode}
          onAddDriver={startAddDriver}
          onClose={() => {
            setSelectedNodeId(null);
            setDraftParentId(null);
            setSaveError("");
          }}
        />
      )}

      {validationReport && <ValidationReportModal report={validationReport} onClose={() => setValidationReport(null)} onExport={exportWorkbook} />}
    </div>
  );
}

function Breadcrumb() {
  return (
    <div className="mb-3 text-xs font-medium text-muted-foreground">
      Tech <span className="mx-1 text-border">&gt;</span> Software <span className="mx-1 text-border">&gt;</span> Development & Deployment <span className="mx-1 text-border">&gt;</span> IAM
    </div>
  );
}

function TopSummaryBar({ tam, sam, vendedSam, onExport }: { tam: number; sam: number; vendedSam: number; onExport: () => void }) {
  const samPct = tam ? (sam / tam) * 100 : 0;
  const vendedPct = sam ? (vendedSam / sam) * 100 : 0;

  return (
    <div className="z-20 grid grid-cols-[1fr_1fr_1fr_auto] bg-mds-navy text-primary-foreground shadow-sm">
      <MetricBlock label="TAM" value={formatMarketValue(tam)} line1="Total addressable" line2="IAM · US · 2025" />
      <MetricBlock label="SAM" value={formatMarketValue(sam)} line1="Serviceable addressable" line2={`${samPct.toFixed(1)}% of TAM`} />
      <MetricBlock label="Vended SAM" value={formatMarketValue(vendedSam)} line1="Current vended spend" line2={`${vendedPct.toFixed(1)}% of SAM`} />
      <div className="flex items-center px-6">
        <button
          type="button"
          className="rounded-md border border-primary-foreground/30 px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
          onClick={onExport}
        >
          Export to Excel
        </button>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, line1, line2 }: { label: string; value: string; line1: string; line2: string }) {
  return (
    <div className="border-r border-primary-foreground/10 px-6 py-5 last:border-r-0">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground">{label}</div>
      <div className="mt-2 text-[32px] font-bold leading-none text-primary-foreground">{value}</div>
      <div className="mt-2 text-[13px] leading-tight text-primary-foreground/70">{line1}</div>
      <div className="mt-1 text-xs leading-tight text-primary-foreground/50">{line2}</div>
    </div>
  );
}

function Legend() {
  return (
    <aside className="absolute right-8 top-4 z-30 h-fit w-56 rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-foreground">Legend</div>
      <LegendRow tone="data" label="Data Input" description="External facts or editable source values." />
      <LegendRow tone="assumption" label="Assumption" description="Analyst judgment driving model scenarios." />
      <LegendRow tone="calculation" label="Calculation" description="Computed output from connected drivers." />
    </aside>
  );
}

function LegendRow({ tone, label, description }: { tone: "data" | "assumption" | "calculation"; label: string; description: string }) {
  const style = KIND_STYLE[tone];

  return (
    <div className="mb-3 flex gap-2 last:mb-0">
      <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", style.dot)} />
      <div>
        <div className={cn("text-xs font-bold", style.text)}>{label}</div>
        <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

function TierBand({
  tone,
  title,
  subtitle,
  rootId,
  nodes,
  values,
  selectedNodeId,
  openMenuId,
  onSelect,
  onMenu,
  onAddDriver,
  onDelete,
  onValueChange,
}: {
  tone: "tam" | "sam" | "vended";
  title: string;
  subtitle: string;
  rootId: string;
  nodes: ModelNode[];
  values: MetricValues;
  selectedNodeId: string | null;
  openMenuId: string | null;
  onSelect: (id: string) => void;
  onMenu: (id: string | null) => void;
  onAddDriver: (id: string) => void;
  onDelete: (id: string) => void;
  onValueChange: (id: string, value: string) => void;
}) {
  const tree = useMemo(() => createTree(nodes, rootId), [nodes, rootId]);
  if (!tree) return null;

  const layout = layoutTree(tree);
  const bandStyle = {
    tam: "border-border bg-surface-muted",
    sam: "border-mds-success/30 bg-mds-success/5",
    vended: "border-mds-warning/40 bg-mds-warning/10",
  }[tone];
  const dotStyle = {
    tam: "bg-mds-blue",
    sam: "bg-mds-success",
    vended: "bg-mds-warning",
  }[tone];

  return (
    <section className={cn("relative rounded-xl border px-6 py-5", bandStyle)}>
      <div className="relative z-10 mb-5 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className={cn("h-2.5 w-2.5 rounded-full", dotStyle)} />
        <span>{title}</span>
        <span className="font-normal text-muted-foreground">— {subtitle}</span>
      </div>

      <div
        className="relative"
        style={{
          width: layout.width,
          minHeight: layout.height,
        }}
      >
        <TreeConnectors items={layout.items} />
        {layout.items.map((item) => (
          <div
            key={item.node.id}
            className="absolute z-10"
            style={{
              left: item.x,
              top: item.y,
              width: item.width,
              height: item.height,
            }}
          >
            <NodeCard
              node={item.node}
              displayValue={values[item.node.id] ?? item.node.value}
              selected={selectedNodeId === item.node.id}
              menuOpen={openMenuId === item.node.id}
              onSelect={() => onSelect(item.node.id)}
              onMenu={() => onMenu(openMenuId === item.node.id ? null : item.node.id)}
              onAddDriver={() => onAddDriver(item.node.id)}
              onDelete={() => onDelete(item.node.id)}
              onValueChange={(value) => onValueChange(item.node.id, value)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function NodeCard({
  node,
  displayValue,
  selected,
  menuOpen,
  onSelect,
  onMenu,
  onAddDriver,
  onDelete,
  onValueChange,
}: {
  node: ModelNode;
  displayValue: number;
  selected: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onMenu: () => void;
  onAddDriver: () => void;
  onDelete: () => void;
  onValueChange: (value: string) => void;
}) {
  const style = KIND_STYLE[node.kind];
  const isCalculation = node.kind === "calculation";
  const isFlow = node.kind === "flow";

  return (
    <div
      className={cn(
        "h-full rounded-[10px] border border-l-4 bg-card px-5 py-4 shadow-sm transition hover:-translate-y-px hover:shadow-md",
        style.border,
        node.kind === "assumption" && "border-destructive/40 bg-destructive/5",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase", style.text)}>
          <span className={cn("h-2 w-2 rounded-full", style.dot)} />
          {style.label}
        </div>
        <div className="relative">
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            onClick={(event) => {
              event.stopPropagation();
              onMenu();
            }}
            aria-label={`Open menu for ${node.title}`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-30 w-44 rounded-md border bg-popover py-1 text-left text-xs text-popover-foreground shadow-lg">
              <MenuButton label="Edit description" onClick={onSelect} />
              <MenuButton label="Change source" onClick={onSelect} />
              <MenuButton label="Add sub-node" onClick={onAddDriver} icon={<Plus className="h-3.5 w-3.5" />} />
              <MenuButton label="Delete node" onClick={onDelete} icon={<Trash2 className="h-3.5 w-3.5" />} destructive disabled={node.protected} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 text-[15px] font-semibold leading-tight text-foreground">{node.title}</div>

      <div className="mt-3">
        {node.editableValue ? (
          <div
            className="flex h-10 items-center rounded-md border border-input bg-background px-2"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {node.unit === "$" && <span className="text-sm font-semibold text-muted-foreground">$</span>}
            <Input
              value={String(node.value)}
              onChange={(event) => onValueChange(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onFocus={(event) => event.stopPropagation()}
              className={cn(
                "h-9 border-0 bg-transparent px-1 text-left text-lg font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
                node.kind === "assumption" ? "text-mds-danger" : "text-foreground",
              )}
            />
            {node.unit !== "$" && <span className="text-xs font-medium text-muted-foreground">{node.unit}</span>}
          </div>
        ) : (
          <div className={cn("text-2xl font-bold leading-tight", isCalculation && "text-mds-success", isFlow && "text-muted-foreground", !isCalculation && !isFlow && "text-foreground")}>
            {formatValue(displayValue, node.unit)}
          </div>
        )}
      </div>

      <div className="mt-2 text-xs leading-snug text-muted-foreground">
        {node.parentId ? `${node.operator} ${formatValue(displayValue, node.unit)} feeds parent` : "Root calculation"}
      </div>
      {node.description && <div className="mt-3 line-clamp-2 text-xs leading-snug text-muted-foreground">{node.description}</div>}
      <div className="mt-2 truncate text-xs italic text-muted-foreground">Source: {node.source}</div>
    </div>
  );
}

function MenuButton({
  label,
  icon,
  destructive,
  disabled,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40",
        destructive && "text-destructive hover:bg-destructive/10",
      )}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function TreeConnectors({ items }: { items: LayoutItem[] }) {
  const parents = items.filter((item) => item.children.length > 0);

  return (
    <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible text-border" aria-hidden="true">
      {parents.map((parent) => {
        const parentX = parent.x + parent.width;
        const trunkX = parentX + COLUMN_GAP / 2;
        const parentY = parent.y + parent.height / 2;
        const childCenters = parent.children.map((child) => child.y + child.height / 2);
        const minChildY = Math.min(...childCenters);
        const maxChildY = Math.max(...childCenters);

        return (
          <g key={parent.node.id}>
            <path
              d={`M ${parentX} ${parentY} H ${trunkX} M ${trunkX} ${minChildY} V ${maxChildY}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {parent.children.map((child) => {
              const childX = child.x;
              const childY = child.y + child.height / 2;

              return (
                <path
                  key={child.node.id}
                  d={`M ${trunkX} ${childY} H ${childX}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
            <OperatorBadge x={trunkX} y={parentY} symbol={getGroupOperator(parent.children)} />
          </g>
        );
      })}
    </svg>
  );
}

function getGroupOperator(children: LayoutItem[]): Operator {
  const operators = children.map((child) => child.node.operator);
  const [firstOperator] = operators;
  return operators.every((operator) => operator === firstOperator) ? firstOperator : "=";
}

function OperatorBadge({ x, y, symbol }: { x: number; y: number; symbol: Operator }) {
  return (
    <g className="text-mds-navy">
      <circle cx={x} cy={y} r="14" fill="currentColor" className="drop-shadow-sm" />
      <text x={x} y={y} dy="5" textAnchor="middle" className="fill-primary-foreground text-sm font-bold">
        {symbol}
      </text>
    </g>
  );
}

function ConfigurationPanel({
  node,
  value,
  isAdding,
  draft,
  saveError,
  onDraftChange,
  onSaveDriver,
  onCancelDriver,
  onUpdateNode,
  onAddDriver,
  onClose,
}: {
  node: ModelNode;
  value: number;
  isAdding: boolean;
  draft: NodeDraft;
  saveError: string;
  onDraftChange: (updates: Partial<NodeDraft>) => void;
  onSaveDriver: () => void;
  onCancelDriver: () => void;
  onUpdateNode: (id: string, updates: Partial<ModelNode>) => void;
  onAddDriver: (id: string) => void;
  onClose: () => void;
}) {
  const panelTitle = isAdding ? "Configure Driver" : "Node Configuration";
  const active = isAdding ? draft : node;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-mds-navy/55 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="configuration-panel-title" onMouseDown={onClose}>
      <div className="w-full max-w-[620px] rounded-xl border bg-card p-6 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{panelTitle}</div>
            <h2 id="configuration-panel-title" className="mt-1 text-xl font-semibold text-foreground">
              {isAdding ? draft.title || "New Driver" : node.title}
            </h2>
            {!isAdding && <div className="mt-2 text-sm font-semibold text-mds-success">{formatValue(value, node.unit)}</div>}
          </div>
          <button type="button" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onClose} aria-label="Close configuration popup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Name">
            <Input
              value={active.title}
              onChange={(event) => (isAdding ? onDraftChange({ title: event.target.value }) : onUpdateNode(node.id, { title: event.target.value }))}
              className="h-11"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Node type">
              <select
                value={active.kind}
                onChange={(event) => {
                  const kind = event.target.value as NodeKind;
                  isAdding ? onDraftChange({ kind }) : onUpdateNode(node.id, { kind });
                }}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="data">Data Input</option>
                <option value="assumption">Assumption</option>
                <option value="calculation">Calculation</option>
                <option value="flow">Flow-In</option>
              </select>
            </Field>

            <Field label="Operator">
              <select
                value={active.operator}
                onChange={(event) => {
                  const operator = event.target.value as Operator;
                  isAdding ? onDraftChange({ operator }) : onUpdateNode(node.id, { operator });
                }}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={!isAdding && !node.parentId}
              >
                {OPERATORS.map((operator) => (
                  <option key={operator} value={operator}>
                    {operatorLabel(operator)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Value" error={isAdding ? saveError : active.value === 0 ? "Value cannot be zero." : ""}>
              <Input
                value={String(active.value)}
                onChange={(event) => {
                  const nextValue = parseInputNumber(event.target.value);
                  isAdding ? onDraftChange({ value: nextValue }) : onUpdateNode(node.id, { value: nextValue });
                }}
                className={cn("h-11", (isAdding ? saveError : active.value === 0) && "border-destructive focus-visible:ring-destructive")}
              />
            </Field>

            <Field label="Unit">
              <select
                value={active.unit}
                onChange={(event) => {
                  const unit = event.target.value as Unit;
                  isAdding ? onDraftChange({ unit }) : onUpdateNode(node.id, { unit });
                }}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={active.description}
              onChange={(event) => (isAdding ? onDraftChange({ description: event.target.value }) : onUpdateNode(node.id, { description: event.target.value }))}
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="What this driver represents..."
            />
          </Field>

          <Field label="Source">
            <Input
              value={active.source}
              onChange={(event) => (isAdding ? onDraftChange({ source: event.target.value }) : onUpdateNode(node.id, { source: event.target.value }))}
              className="h-11"
              placeholder="e.g. Expert interviews, CapIQ"
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          {isAdding ? (
            <>
              <button type="button" className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted" onClick={onCancelDriver}>
                Cancel
              </button>
              <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-mds-blue-hover" onClick={onSaveDriver}>
                Save Driver
              </button>
            </>
          ) : (
            <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-mds-blue-hover" onClick={() => onAddDriver(node.id)}>
              Add Driver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function ValidationReportModal({ report, onClose, onExport }: { report: ValidationReport; onClose: () => void; onExport: () => void }) {
  const totalChecks = report.checks.length;
  const passedChecks = report.checks.filter((check) => check.passed).length;
  const failedChecks = totalChecks - passedChecks;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-mds-navy/55 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="validation-report-title" onMouseDown={onClose}>
      <div className="w-full max-w-[720px] rounded-xl border bg-card p-6 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Excel Export Validation</div>
            <h2 id="validation-report-title" className="mt-1 text-xl font-semibold text-foreground">
              {report.canExport ? "Workbook is ready to export" : "Export blocked"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {totalChecks} checks run · {passedChecks} passed · {failedChecks} failed
            </p>
          </div>
          <button type="button" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onClose} aria-label="Close validation report">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {report.checks.map((check) => (
            <div key={check.name} className={cn("rounded-lg border p-3", check.passed ? "border-mds-success/30 bg-mds-success/5" : "border-destructive/30 bg-destructive/5")}>
              <div className={cn("text-sm font-semibold", check.passed ? "text-mds-success" : "text-destructive")}>
                {check.passed ? "Passed" : "Failed"} · {check.name}
              </div>
              {check.details.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {check.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-mds-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!report.canExport}
            onClick={onExport}
          >
            Download Workbook
          </button>
        </div>
      </div>
    </div>
  );
}

function CrossTierFlowLink({ label }: { label: string }) {
  const tierPadding = 24;
  const sourceCenterX = tierPadding + NODE_WIDTH / 2;
  const targetCenterX = tierPadding + NODE_WIDTH + COLUMN_GAP + NODE_WIDTH / 2;
  const startY = 0;
  const elbowY = 26;
  const endY = 52;

  return (
    <div className="relative h-14 text-[10px] font-semibold text-muted-foreground">
      <svg className="absolute left-0 top-0 h-14 overflow-visible text-border" style={{ width: targetCenterX + NODE_WIDTH / 2 }} aria-hidden="true">
        <path
          d={`M ${sourceCenterX} ${startY} V ${elbowY} H ${targetCenterX} V ${endY}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 4"
        />
      </svg>
      <span className="absolute top-5 rounded-full bg-background px-2 py-0.5" style={{ left: targetCenterX + 16 }}>
        {label}
      </span>
    </div>
  );
}

function createTree(nodes: ModelNode[], rootId: string): TreeItem | null {
  const byParent = new Map<string, ModelNode[]>();
  nodes.forEach((node) => {
    if (!node.parentId) return;
    byParent.set(node.parentId, [...(byParent.get(node.parentId) ?? []), node]);
  });
  byParent.forEach((children) => children.sort((a, b) => a.order - b.order));

  const build = (node: ModelNode, depth: number): TreeItem => {
    const children = (byParent.get(node.id) ?? []).map((child) => build(child, depth + 1));
    return { node, children, depth };
  };

  const root = nodes.find((node) => node.id === rootId);
  return root ? build(root, 0) : null;
}

function layoutTree(tree: TreeItem): TreeLayout {
  const measure = (item: TreeItem): LayoutItem => {
    const children = item.children.map(measure);
    const childrenHeight = children.reduce((sum, child, index) => sum + child.subtreeHeight + (index === 0 ? 0 : SIBLING_GAP), 0);
    const subtreeHeight = Math.max(NODE_HEIGHT, childrenHeight);

    return {
      ...item,
      children,
      x: item.depth * (NODE_WIDTH + COLUMN_GAP),
      y: 0,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      subtreeHeight,
    };
  };

  const place = (item: LayoutItem, top: number): LayoutItem => {
    if (!item.children.length) {
      return { ...item, y: top };
    }

    const childrenTotalHeight = item.children.reduce((sum, child, index) => sum + child.subtreeHeight + (index === 0 ? 0 : SIBLING_GAP), 0);
    let childTop = top + (item.subtreeHeight - childrenTotalHeight) / 2;
    const children = item.children.map((child) => {
      const placedChild = place(child, childTop);
      childTop += child.subtreeHeight + SIBLING_GAP;
      return placedChild;
    });
    const firstChild = children[0];
    const lastChild = children[children.length - 1];
    const childrenCenterY = (firstChild.y + firstChild.height / 2 + lastChild.y + lastChild.height / 2) / 2;

    return {
      ...item,
      children,
      y: Math.max(top, childrenCenterY - item.height / 2),
    };
  };

  const root = place(measure(tree), 0);
  const items = flattenLayout(root);
  const maxRight = Math.max(...items.map((item) => item.x + item.width));
  const maxBottom = Math.max(...items.map((item) => item.y + item.height));

  return {
    items,
    width: maxRight,
    height: Math.max(root.subtreeHeight, maxBottom),
  };
}

function flattenLayout(tree: LayoutItem): LayoutItem[] {
  return [tree, ...tree.children.flatMap(flattenLayout)];
}

function calculateValues(nodes: ModelNode[]) {
  const values: MetricValues = {};
  const childrenByParent = new Map<string, ModelNode[]>();
  nodes.forEach((node) => {
    if (!node.parentId) return;
    childrenByParent.set(node.parentId, [...(childrenByParent.get(node.parentId) ?? []), node]);
  });
  childrenByParent.forEach((children) => children.sort((a, b) => a.order - b.order));

  const evaluate = (node: ModelNode): number => {
    if (values[node.id] !== undefined) return values[node.id];

    if (node.id === "tam-flow") {
      values[node.id] = evaluate(nodes.find((item) => item.id === "tam") ?? node);
      return values[node.id];
    }
    if (node.id === "sam-flow") {
      values[node.id] = evaluate(nodes.find((item) => item.id === "sam") ?? node);
      return values[node.id];
    }

    const children = childrenByParent.get(node.id) ?? [];
    if (!children.length) {
      values[node.id] = normalizeUnitValue(node.value, node.unit);
      return values[node.id];
    }

    let result = 0;
    children.forEach((child, index) => {
      const childValue = evaluate(child);
      result = index === 0 ? childValue : applyOperator(result, childValue, child.operator);
    });

    values[node.id] = result;
    return result;
  };

  nodes.filter((node) => !node.parentId).forEach(evaluate);
  nodes.forEach(evaluate);
  return values;
}

function applyOperator(current: number, next: number, operator: Operator) {
  if (operator === "×") return current * next;
  if (operator === "÷") return next === 0 ? current : current / next;
  if (operator === "+") return current + next;
  if (operator === "−") return current - next;
  return next;
}

function normalizeUnitValue(value: number, unit: Unit) {
  if (unit === "%") return value / 100;
  return value;
}

function getDescendantIds(nodes: ModelNode[], id: string): string[] {
  const children = nodes.filter((node) => node.parentId === id);
  return children.flatMap((child) => [child.id, ...getDescendantIds(nodes, child.id)]);
}

function createDraft(parent?: ModelNode): NodeDraft {
  return {
    title: "New Driver",
    kind: parent?.kind === "calculation" ? "assumption" : "data",
    operator: "×",
    value: 0,
    unit: "%",
    description: "",
    source: "",
  };
}

function operatorLabel(operator: Operator) {
  const labels = {
    "×": "Multiply (×)",
    "÷": "Divide (÷)",
    "+": "Add (+)",
    "−": "Subtract (−)",
    "=": "Equals (=)",
  } satisfies Record<Operator, string>;
  return labels[operator];
}

function parseInputNumber(value: string) {
  const parsed = Number(value.replace(/[$,%\s/yr]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatValue(value: number, unit: Unit) {
  if (unit === "$" || unit === "$/yr") return formatMarketValue(value);
  if (unit === "%") return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  if (unit === "ratio") return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatMarketValue(value: number) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function validateExport(nodes: ModelNode[], values: MetricValues, vendors: Vendor[]): ValidationReport {
  const circularReferences = detectCircularReferences(nodes);
  const missingAssumptions = nodes
    .filter((node) => node.kind === "assumption" && (!Number.isFinite(node.value) || node.value === 0))
    .map((node) => node.title);
  const unresolvedCalculations = nodes
    .filter((node) => (node.kind === "calculation" || node.kind === "flow") && !Number.isFinite(values[node.id]))
    .map((node) => node.title);
  const emptySources = nodes.filter((node) => !node.source.trim()).map((node) => node.title);
  const emptyVendorFields = vendors.flatMap((vendor) => {
    const issues: string[] = [];
    if (!vendor.name?.trim()) issues.push(`${vendor.id}: missing vendor name`);
    if (!vendor.segment?.trim()) issues.push(`${vendor.name}: missing segment`);
    if (!vendor.filingSource?.trim() && !vendor.filingUrl?.trim() && !vendor.rationale?.trim()) issues.push(`${vendor.name}: missing source/rationale`);
    return issues;
  });

  const checks: ValidationCheck[] = [
    {
      name: "Calculation nodes resolve",
      passed: unresolvedCalculations.length === 0,
      details: unresolvedCalculations.length ? unresolvedCalculations : ["All calculation and flow-in nodes resolve."],
    },
    {
      name: "No circular dependencies",
      passed: circularReferences.length === 0,
      details: circularReferences.length ? circularReferences : ["No parent-child cycles detected."],
    },
    {
      name: "Assumption values populated",
      passed: missingAssumptions.length === 0,
      details: missingAssumptions.length ? missingAssumptions : ["All assumption nodes have non-zero values."],
    },
    {
      name: "Vendor list exportable",
      passed: emptyVendorFields.length === 0,
      details: emptyVendorFields.length
        ? emptyVendorFields
        : [vendors.length > 0 ? `${vendors.length} vendors ready for export.` : "No vendors included; Vendor List sheet will export empty."],
    },
    {
      name: "Sources populated",
      passed: emptySources.length === 0,
      details: emptySources.length ? emptySources : ["All model nodes include sources."],
    },
  ];

  return {
    checks,
    missingAssumptions,
    unresolvedCalculations,
    circularReferences,
    emptyVendorFields,
    emptySources,
    canExport: checks.every((check) => check.passed),
  };
}

function detectCircularReferences(nodes: ModelNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const cycles: string[] = [];

  nodes.forEach((node) => {
    const seen = new Set<string>();
    let current: ModelNode | undefined = node;

    while (current?.parentId) {
      if (seen.has(current.id)) {
        cycles.push(`Cycle detected at ${current.title}`);
        return;
      }
      seen.add(current.id);
      current = byId.get(current.parentId);
    }
  });

  return Array.from(new Set(cycles));
}

async function exportMarketModelWorkbook(nodes: ModelNode[], values: MetricValues, vendors: Vendor[]) {
  const response = await fetch("/templates/Hackathon_Model_Template.xlsx");
  if (!response.ok) throw new Error("Could not load Excel export template.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await response.arrayBuffer());

  const output = requireWorksheet(workbook, "Output");
  const assumptions = requireWorksheet(workbook, "Assumptions");
  const rawData = requireWorksheet(workbook, "Raw Data");
  const vendorList = requireWorksheet(workbook, "Vendor List");
  const sources = requireWorksheet(workbook, "Sources & Notes");
  const sortedNodes = sortNodesForExport(nodes);
  const leafCellById = populateTemplateInputs(assumptions, rawData, sortedNodes);

  output.getCell("C14").value = { formula: createFormulaForNode("tam", nodes, leafCellById), result: values.tam };
  output.getCell("C16").value = { formula: createFormulaForNode("sam", nodes, leafCellById), result: values.sam };
  output.getCell("C18").value = { formula: createFormulaForNode("vended-sam", nodes, leafCellById), result: values["vended-sam"] };

  populateVendorList(vendorList, vendors);
  populateSourcesAndNotes(sources, sortedNodes, vendors);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbook(buffer, `market-model-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function requireWorksheet(workbook: ExcelJS.Workbook, name: string) {
  const worksheet = workbook.getWorksheet(name);
  if (!worksheet) throw new Error(`Template is missing required sheet: ${name}`);
  return worksheet;
}

function downloadWorkbook(buffer: ExcelJS.Buffer, fileName: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function sortNodesForExport(nodes: ModelNode[]) {
  const roots = nodes.filter((node) => !node.parentId).sort((a, b) => a.order - b.order);
  const byParent = new Map<string, ModelNode[]>();
  nodes.forEach((node) => {
    if (!node.parentId) return;
    byParent.set(node.parentId, [...(byParent.get(node.parentId) ?? []), node]);
  });
  byParent.forEach((children) => children.sort((a, b) => a.order - b.order));

  const walk = (node: ModelNode): ModelNode[] => [node, ...(byParent.get(node.id) ?? []).flatMap(walk)];
  return roots.flatMap(walk);
}

function populateTemplateInputs(assumptions: ExcelJS.Worksheet, rawData: ExcelJS.Worksheet, nodes: ModelNode[]) {
  const leafCellById = new Map<string, string>();
  const baseAssumptionRows: Record<string, number> = {
    companies: 7,
    users: 8,
    spend: 9,
    "logo-penetration": 10,
    "seat-adoption": 11,
  };

  Object.entries(baseAssumptionRows).forEach(([id, rowNumber]) => {
    const node = nodes.find((item) => item.id === id);
    if (!node) return;
    assumptions.getCell(`B${rowNumber}`).value = node.title;
    assumptions.getCell(`C${rowNumber}`).value = valueForWorkbook(node);
    assumptions.getCell(`D${rowNumber}`).value = node.unit;
    assumptions.getCell(`E${rowNumber}`).value = node.source;
    assumptions.getCell(`F${rowNumber}`).value = node.description;
    leafCellById.set(id, `'Assumptions'!$C$${rowNumber}`);
  });

  const dynamicAssumptions = nodes.filter((node) => node.kind === "assumption" && !baseAssumptionRows[node.id]);
  dynamicAssumptions.forEach((node, index) => {
    const rowNumber = 12 + index;
    copyRowStyle(assumptions, 11, rowNumber);
    assumptions.getCell(`B${rowNumber}`).value = node.title;
    assumptions.getCell(`C${rowNumber}`).value = valueForWorkbook(node);
    assumptions.getCell(`D${rowNumber}`).value = node.unit;
    assumptions.getCell(`E${rowNumber}`).value = node.source;
    assumptions.getCell(`F${rowNumber}`).value = node.description;
    leafCellById.set(node.id, `'Assumptions'!$C$${rowNumber}`);
  });

  const dynamicDataInputs = nodes.filter((node) => node.kind === "data" && !baseAssumptionRows[node.id]);
  if (dynamicDataInputs.length > 0) {
    const startRow = rawData.rowCount + 2;
    const headerRow = rawData.getRow(startRow);
    ["Node ID", "Parent ID", "Title", "Value", "Unit", "Operator", "Description", "Source"].forEach((value, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = value;
      cell.font = { ...rawData.getRow(1).getCell(index + 1).font };
      cell.fill = rawData.getRow(1).getCell(index + 1).fill;
      cell.border = rawData.getRow(1).getCell(index + 1).border;
      cell.alignment = rawData.getRow(1).getCell(index + 1).alignment;
    });
    headerRow.commit();

    dynamicDataInputs.forEach((node, index) => {
      const rowNumber = startRow + 1 + index;
      copyRowStyle(rawData, 2, rowNumber);
      const row = rawData.getRow(rowNumber);
      row.getCell(1).value = node.id;
      row.getCell(2).value = node.parentId ?? "";
      row.getCell(3).value = node.title;
      row.getCell(4).value = valueForWorkbook(node);
      row.getCell(5).value = node.unit;
      row.getCell(6).value = node.operator;
      row.getCell(7).value = node.description;
      row.getCell(8).value = node.source;
      row.commit();
      leafCellById.set(node.id, `'Raw Data'!$D$${rowNumber}`);
    });
  }

  return leafCellById;
}

function populateVendorList(worksheet: ExcelJS.Worksheet, vendors: Vendor[]) {
  const maxRowsToClear = Math.max(worksheet.rowCount, vendors.length + 1);
  for (let rowNumber = 2; rowNumber <= maxRowsToClear; rowNumber += 1) {
    for (let colNumber = 1; colNumber <= 7; colNumber += 1) {
      worksheet.getRow(rowNumber).getCell(colNumber).value = null;
    }
  }

  vendors.forEach((vendor, index) => {
    const rowNumber = index + 2;
    copyRowStyle(worksheet, 2, rowNumber);
    const row = worksheet.getRow(rowNumber);
    row.getCell(1).value = vendor.name;
    row.getCell(2).value = vendor.ticker;
    row.getCell(3).value = vendor.totalCompanyRevenue ?? vendor.revenue;
    row.getCell(4).value = vendor.fiscalYear ?? 2025;
    row.getCell(5).value = vendor.filingType;
    row.getCell(6).value = vendor.secRetrievedAt ? new Date(vendor.secRetrievedAt) : null;
    row.getCell(7).value = vendor.notes ?? vendor.rationale ?? vendor.confidenceRationale ?? "";
    row.commit();
  });
}

function populateSourcesAndNotes(worksheet: ExcelJS.Worksheet, nodes: ModelNode[], vendors: Vendor[]) {
  const startRow = Math.max(worksheet.rowCount + 2, 16);
  worksheet.getCell(`B${startRow}`).value = "Live Dashboard Sources";
  copyRowStyle(worksheet, 11, startRow + 1);
  worksheet.getCell(`B${startRow + 1}`).value = "Source";
  worksheet.getCell(`C${startRow + 1}`).value = "Detail";

  const sourceRows = [
    ...nodes.map((node) => [node.title, `${node.source}${node.description ? ` — ${node.description}` : ""}`]),
    ...vendors.map((vendor) => [vendor.name, vendor.filingUrl ?? vendor.filingSource ?? vendor.rationale ?? vendor.confidenceRationale ?? ""]),
  ];

  sourceRows.forEach(([source, detail], index) => {
    const rowNumber = startRow + 2 + index;
    copyRowStyle(worksheet, 12, rowNumber);
    worksheet.getCell(`B${rowNumber}`).value = source;
    worksheet.getCell(`C${rowNumber}`).value = detail;
  });
}

function createFormulaForNode(nodeId: string, nodes: ModelNode[], leafCellById: Map<string, string>, stack: string[] = []): string {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) return "0";
  if (stack.includes(nodeId)) return "0";
  if (node.id === "tam-flow") return "'Output'!$C$5";
  if (node.id === "sam-flow") return "'Output'!$C$6";

  const children = nodes.filter((child) => child.parentId === node.id).sort((a, b) => a.order - b.order);
  if (!children.length) return leafCellById.get(node.id) ?? `${valueForWorkbook(node)}`;

  return children.reduce((formula, child, index) => {
    const childFormula = `(${createFormulaForNode(child.id, nodes, leafCellById, [...stack, nodeId])})`;
    if (index === 0 || child.operator === "=") return childFormula;
    return `${formula}${excelOperator(child.operator)}${childFormula}`;
  }, "");
}

function valueForWorkbook(node: ModelNode) {
  return node.unit === "%" ? node.value / 100 : node.value;
}

function copyRowStyle(worksheet: ExcelJS.Worksheet, sourceRowNumber: number, targetRowNumber: number) {
  const sourceRow = worksheet.getRow(sourceRowNumber);
  const targetRow = worksheet.getRow(targetRowNumber);
  targetRow.height = sourceRow.height;

  sourceRow.eachCell({ includeEmpty: true }, (sourceCell, colNumber) => {
    const targetCell = targetRow.getCell(colNumber);
    targetCell.style = JSON.parse(JSON.stringify(sourceCell.style));
    targetCell.numFmt = sourceCell.numFmt;
  });
}

function excelOperator(operator: Operator) {
  if (operator === "×") return "*";
  if (operator === "÷") return "/";
  if (operator === "−") return "-";
  if (operator === "+") return "+";
  return "";
}
