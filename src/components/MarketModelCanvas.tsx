import { useMemo, useState } from "react";
import { MoreVertical, Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  row: number;
  rowSpan: number;
};

type MetricValues = Record<string, number>;

const NODE_WIDTH = 280;
const COLUMN_GAP = 88;
const ROW_HEIGHT = 190;
const CARD_MIN_HEIGHT = 152;
const OPERATORS: Operator[] = ["×", "÷", "+", "−", "="];
const UNITS: Unit[] = ["%", "$", "count", "ratio", "$/yr"];

const KIND_STYLE = {
  data: {
    dot: "bg-mds-blue",
    border: "border-l-mds-blue",
    text: "text-mds-blue",
    label: "DATA INPUT",
  },
  assumption: {
    dot: "bg-mds-danger",
    border: "border-l-mds-danger",
    text: "text-mds-danger",
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
    value: 380000,
    unit: "count",
    description: "By number of FTE by industry; full universe of potential buyers.",
    source: "US Census Bureau, CapIQ",
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
    value: 120,
    unit: "count",
    description: "Average number of IAM-eligible users per company.",
    source: "BLS, Expert interviews, Survey",
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
  const [nodes, setNodes] = useState<ModelNode[]>(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [draftParentId, setDraftParentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NodeDraft>(createDraft());
  const [saveError, setSaveError] = useState("");

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

  return (
    <div className="flex h-full min-w-0 flex-col bg-background text-foreground">
      <TopSummaryBar tam={tam} sam={sam} vendedSam={vendedSam} />

      <main className="min-h-0 min-w-0 flex-1 overflow-auto bg-background canvas-dot-grid">
        <div className="min-w-[980px] px-8 pb-10 pt-4">
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

            <FlowIndicator label={`TAM: ${formatMarketValue(tam)} flows in ↓`} />

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

            <FlowIndicator label={`SAM: ${formatMarketValue(sam)} flows in ↓`} />

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

function TopSummaryBar({ tam, sam, vendedSam }: { tam: number; sam: number; vendedSam: number }) {
  const samPct = tam ? (sam / tam) * 100 : 0;
  const vendedPct = sam ? (vendedSam / sam) * 100 : 0;

  return (
    <div className="z-20 grid grid-cols-3 bg-mds-navy text-primary-foreground shadow-sm">
      <MetricBlock label="TAM" value={formatMarketValue(tam)} line1="Total addressable" line2="IAM · US · 2025" />
      <MetricBlock label="SAM" value={formatMarketValue(sam)} line1="Serviceable addressable" line2={`${samPct.toFixed(1)}% of TAM`} />
      <MetricBlock label="Vended SAM" value={formatMarketValue(vendedSam)} line1="Current vended spend" line2={`${vendedPct.toFixed(1)}% of SAM`} />
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

  const items = flattenTree(tree);
  const maxDepth = Math.max(...items.map((item) => item.depth));
  const rowCount = Math.max(...items.map((item) => item.row)) + 1;
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
          width: (maxDepth + 1) * NODE_WIDTH + maxDepth * COLUMN_GAP,
          minHeight: rowCount * ROW_HEIGHT,
        }}
      >
        <TreeConnectors items={items} />
        {items.map((item) => (
          <div
            key={item.node.id}
            className="absolute z-10"
            style={{
              left: item.depth * (NODE_WIDTH + COLUMN_GAP),
              top: item.row * ROW_HEIGHT + ((item.rowSpan - 1) * ROW_HEIGHT) / 2,
              width: NODE_WIDTH,
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
  const isCalculated = node.kind === "calculation" || node.kind === "flow";

  return (
    <div
      className={cn(
        "min-h-[152px] rounded-[10px] border border-l-4 bg-card px-5 py-4 shadow-sm transition hover:-translate-y-px hover:shadow-md",
        style.border,
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
          <div className="flex h-10 items-center rounded-md border border-input bg-background px-2">
            {node.unit === "$" && <span className="text-sm font-semibold text-muted-foreground">$</span>}
            <Input
              value={String(node.value)}
              onChange={(event) => onValueChange(event.target.value)}
              className="h-9 border-0 bg-transparent px-1 text-left text-lg font-semibold text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {node.unit !== "$" && <span className="text-xs font-medium text-muted-foreground">{node.unit}</span>}
          </div>
        ) : (
          <div className={cn("text-2xl font-bold leading-tight", isCalculated ? "text-mds-success" : "text-foreground")}>{formatValue(displayValue, node.unit)}</div>
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

function TreeConnectors({ items }: { items: TreeItem[] }) {
  const byId = new Map(items.map((item) => [item.node.id, item]));
  const links = items.flatMap((item) =>
    item.children.map((child) => ({
      parent: item,
      child: byId.get(child.node.id) ?? child,
    })),
  );

  return (
    <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible text-border" aria-hidden="true">
      {links.map(({ parent, child }) => {
        const parentX = parent.depth * (NODE_WIDTH + COLUMN_GAP) + NODE_WIDTH;
        const childX = child.depth * (NODE_WIDTH + COLUMN_GAP);
        const trunkX = parentX + COLUMN_GAP / 2;
        const parentY = parent.row * ROW_HEIGHT + ((parent.rowSpan - 1) * ROW_HEIGHT) / 2 + CARD_MIN_HEIGHT / 2;
        const childY = child.row * ROW_HEIGHT + CARD_MIN_HEIGHT / 2;

        return (
          <g key={`${parent.node.id}-${child.node.id}`}>
            <path
              d={`M ${parentX} ${parentY} H ${trunkX} V ${childY} H ${childX}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <OperatorBadge x={trunkX} y={childY} symbol={child.node.operator} />
          </g>
        );
      })}
    </svg>
  );
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

function FlowIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pl-24 text-[10px] font-semibold text-muted-foreground">
      <span className="h-4 border-l-2 border-dashed border-muted-foreground/60" />
      <span>{label}</span>
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

  let row = 0;
  const build = (node: ModelNode, depth: number): TreeItem => {
    const children = (byParent.get(node.id) ?? []).map((child) => build(child, depth + 1));
    if (!children.length) {
      return { node, children, depth, row: row++, rowSpan: 1 };
    }

    const rowSpan = children.reduce((sum, child) => sum + child.rowSpan, 0);
    const firstChild = children[0];
    const lastChild = children[children.length - 1];
    return {
      node,
      children,
      depth,
      row: Math.round((firstChild.row + lastChild.row) / 2),
      rowSpan,
    };
  };

  const root = nodes.find((node) => node.id === rootId);
  return root ? build(root, 0) : null;
}

function flattenTree(tree: TreeItem): TreeItem[] {
  return [tree, ...tree.children.flatMap(flattenTree)];
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
