import { useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Input } from "@/components/ui/input";
import { useModel } from "@/store/ModelStore";
import { Edit3, Minus, Plus, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type BoxType = "data" | "assumption" | "calculation";
type Operator = "×" | "+" | "−" | "÷" | "=";
type BoxId = "companies" | "users" | "spend" | "perCompany" | "tam" | "serviceable" | "sam" | "adoption" | "vendedSam" | string;

type CanvasBox = {
  id: BoxId;
  type: BoxType;
  title: string;
  value: string;
  description: string;
  source: string;
  x: number;
  y: number;
  width?: number;
  preview?: boolean;
};

type Connection = {
  id: string;
  from: BoxId;
  to: BoxId;
  operator: Operator;
  preview?: boolean;
};

type DragState = {
  id?: BoxId;
  pan?: boolean;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

const BASE_BOXES: CanvasBox[] = [
  {
    id: "users",
    type: "data",
    title: "# users per company",
    value: "120",
    description: "Number of users per company.",
    source: "BLS, Expert interviews, Survey",
    x: 360,
    y: 110,
  },
  {
    id: "spend",
    type: "assumption",
    title: "Avg annual spend per seat",
    value: "120",
    description: "Average annual spend per seat by sub-domain.",
    source: "Expert interviews, Survey, Vendor data",
    x: 660,
    y: 110,
  },
  {
    id: "perCompany",
    type: "calculation",
    title: "$ per Company",
    value: "$14,400",
    description: "Annual spend per company on IAM software.",
    source: "Live formula output",
    x: 960,
    y: 110,
  },
  {
    id: "companies",
    type: "data",
    title: "# of Companies in the US",
    value: "380,000",
    description: "By number of FTE by industry.",
    source: "US Census Bureau, CapIQ",
    x: 230,
    y: 470,
  },
  {
    id: "tam",
    type: "calculation",
    title: "Total Addressable Market",
    value: "$5.47B",
    description: "Total market spend at full potential adoption.",
    source: "Live formula output",
    x: 960,
    y: 470,
    width: 280,
  },
  {
    id: "serviceable",
    type: "assumption",
    title: "% Serviceable Companies",
    value: "65",
    description: "Preview filter for serviceable company coverage.",
    source: "Expert interviews, Survey",
    x: 560,
    y: 790,
    preview: true,
  },
  {
    id: "sam",
    type: "calculation",
    title: "SAM",
    value: "$3.56B",
    description: "Serviceable addressable market preview.",
    source: "Live formula output",
    x: 960,
    y: 790,
    preview: true,
  },
  {
    id: "adoption",
    type: "assumption",
    title: "Seat Adoption Rate",
    value: "45",
    description: "Preview rate for current seat adoption.",
    source: "Expert estimates, Market revenues, Vendor data",
    x: 560,
    y: 1050,
    preview: true,
  },
  {
    id: "vendedSam",
    type: "calculation",
    title: "Vended SAM",
    value: "$1.60B",
    description: "Current vended serviceable market preview.",
    source: "Live formula output",
    x: 960,
    y: 1050,
    preview: true,
  },
];

const BASE_CONNECTIONS: Connection[] = [
  { id: "users-per-company", from: "users", to: "perCompany", operator: "×" },
  { id: "spend-per-company", from: "spend", to: "perCompany", operator: "×" },
  { id: "companies-tam", from: "companies", to: "tam", operator: "×" },
  { id: "per-company-tam", from: "perCompany", to: "tam", operator: "×" },
  { id: "tam-sam", from: "tam", to: "sam", operator: "×", preview: true },
  { id: "serviceable-sam", from: "serviceable", to: "sam", operator: "×", preview: true },
  { id: "sam-vended", from: "sam", to: "vendedSam", operator: "×", preview: true },
  { id: "adoption-vended", from: "adoption", to: "vendedSam", operator: "×", preview: true },
];

const BOX_STYLE = {
  data: { dot: "bg-blue-600", border: "border-l-blue-600", label: "DATA INPUT", ring: "focus-visible:ring-blue-500" },
  assumption: { dot: "bg-red-600", border: "border-l-red-600", label: "ASSUMPTION", ring: "focus-visible:ring-red-500" },
  calculation: { dot: "bg-green-600", border: "border-l-green-600", label: "CALCULATION", ring: "focus-visible:ring-green-500" },
} satisfies Record<BoxType, { dot: string; border: string; label: string; ring: string }>;

const OPERATORS: Operator[] = ["×", "+", "−", "÷", "="];
const GRID_SIZE = 20;
const BOX_HEIGHT = 230;

export default function ModelEngine() {
  const { market } = useModel();
  const [boxes, setBoxes] = useState<CanvasBox[]>(BASE_BOXES);
  const [connections, setConnections] = useState<Connection[]>(BASE_CONNECTIONS);
  const [expandedBox, setExpandedBox] = useState<BoxId | null>("tam");
  const [selectedBox, setSelectedBox] = useState<BoxId | null>(null);
  const [activeOperator, setActiveOperator] = useState<Operator>("×");
  const [connectFrom, setConnectFrom] = useState<BoxId | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [history, setHistory] = useState<CanvasBox[][]>([]);
  const [future, setFuture] = useState<CanvasBox[][]>([]);
  const dragRef = useRef<DragState | null>(null);

  const metrics = useMemo(() => calculateMetrics(boxes), [boxes]);
  const boxesWithCalcs = useMemo(() => applyCalculatedValues(boxes, metrics), [boxes, metrics]);
  const activeConnections = connections.filter((connection) => !connection.preview);
  const allConnections = connections;

  const updateBoxValue = (id: BoxId, value: string) => {
    snapshot();
    setBoxes((current) => current.map((box) => (box.id === id ? { ...box, value } : box)));
  };

  const moveBox = (id: BoxId, x: number, y: number) => {
    setBoxes((current) => current.map((box) => (box.id === id ? { ...box, x, y } : box)));
  };

  const snapshot = () => {
    setHistory((current) => [...current.slice(-19), boxes]);
    setFuture([]);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((current) => [boxes, ...current]);
    setBoxes(previous);
    setHistory((current) => current.slice(0, -1));
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory((current) => [...current, boxes]);
    setBoxes(next);
    setFuture((current) => current.slice(1));
  };

  const addBox = () => {
    const type = window.prompt("Box type: Data, Assumption, or Calculation?", "Data")?.toLowerCase();
    const normalized: BoxType = type?.startsWith("a") ? "assumption" : type?.startsWith("c") ? "calculation" : "data";
    snapshot();
    setBoxes((current) => [
      ...current,
      {
        id: `box-${Date.now()}`,
        type: normalized,
        title: normalized === "calculation" ? "New Calculation" : normalized === "assumption" ? "New Assumption" : "New Data Point",
        value: "0",
        description: "Describe what this box represents.",
        source: normalized === "calculation" ? "Live formula output" : "Source TBD",
        x: 520 - pan.x / zoom,
        y: 360 - pan.y / zoom,
      },
    ]);
  };

  const onBoxMouseDown = (event: ReactMouseEvent, box: CanvasBox) => {
    if ((event.target as HTMLElement).closest("input,button")) return;
    event.stopPropagation();
    snapshot();
    setSelectedBox(box.id);
    dragRef.current = {
      id: box.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: box.x,
      originY: box.y,
    };
  };

  const onCanvasMouseDown = (event: ReactMouseEvent) => {
    if ((event.target as HTMLElement).closest("button,input")) return;
    setSelectedBox(null);
    dragRef.current = {
      pan: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  };

  const onMouseMove = (event: ReactMouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / (drag.id ? zoom : 1);
    const dy = (event.clientY - drag.startY) / (drag.id ? zoom : 1);
    if (drag.id) {
      const x = drag.originX + dx;
      const y = drag.originY + dy;
      moveBox(drag.id, snapToGrid ? snap(x) : x, snapToGrid ? snap(y) : y);
      return;
    }
    if (drag.pan) setPan({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY });
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  const onBoxClick = (box: CanvasBox) => {
    setSelectedBox(box.id);
    if (connectMode) {
      if (!connectFrom) {
        setConnectFrom(box.id);
        return;
      }
      if (connectFrom !== box.id) {
        setConnections((current) => [
          ...current,
          { id: `${connectFrom}-${box.id}-${Date.now()}`, from: connectFrom, to: box.id, operator: activeOperator },
        ]);
      }
      setConnectFrom(null);
      setConnectMode(false);
      return;
    }
    if (box.type === "calculation") setExpandedBox((current) => (current === box.id ? null : box.id));
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    setZoom((current) => clamp(current - event.deltaY * 0.001, 0.25, 2));
  };

  return (
    <div className="grid h-full grid-cols-[260px_minmax(0,1fr)] bg-surface-muted">
      <aside className="border-r bg-card overflow-y-auto">
        <PanelHeader title="Market Drill-Down" actions={<><IconBtn icon={Plus} /><IconBtn icon={Edit3} /><IconBtn icon={Trash2} /></>} />
        <div className="px-4 pt-4 text-[11px] text-muted-foreground">Horizontal › Tech › Software › Development & Deployment › IAM</div>
        <DrillDownTree />
      </aside>

      <section className="relative flex min-w-0 flex-col overflow-hidden">
        <TopSummary tam={formatCurrencyB(metrics.tam)} boxCount={boxes.length} linkCount={activeConnections.length} timeframe={market.timeframe} />

        <div className="relative flex-1 overflow-hidden bg-slate-100" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={handleWheel}>
          <div
            className={cn("absolute inset-0 cursor-grab active:cursor-grabbing", showGrid && "canvas-dot-grid")}
            onMouseDown={onCanvasMouseDown}
            style={{ backgroundColor: "white" }}
          >
            <div
              className="absolute left-0 top-0 h-[1800px] w-[2200px] origin-top-left"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
              <ConnectionLayer boxes={boxesWithCalcs} connections={allConnections} />
              {boxesWithCalcs.map((box) => (
                <CanvasBoxCard
                  key={box.id}
                  box={box}
                  selected={selectedBox === box.id || connectFrom === box.id}
                  expanded={expandedBox === box.id}
                  linkedInputs={getLinkedInputs(box, boxesWithCalcs, allConnections, metrics)}
                  outgoing={allConnections.filter((connection) => connection.from === box.id)}
                  onMouseDown={(event) => onBoxMouseDown(event, box)}
                  onClick={() => onBoxClick(box)}
                  onChange={(value) => updateBoxValue(box.id, value)}
                  onCommit={() => updateBoxValue(box.id, formatBoxValue(box))}
                />
              ))}
              <PreviewFormula tam={metrics.tam} sam={metrics.sam} vendedSam={metrics.vendedSam} />
            </div>
          </div>

          <Legend collapsed={legendCollapsed} onToggle={() => setLegendCollapsed((collapsed) => !collapsed)} />
          <MiniMap boxes={boxesWithCalcs} />
        </div>

        <Toolbar
          activeOperator={activeOperator}
          setActiveOperator={setActiveOperator}
          connectMode={connectMode}
          setConnectMode={setConnectMode}
          addBox={addBox}
          undo={undo}
          redo={redo}
          zoom={zoom}
          setZoom={setZoom}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          snapToGrid={snapToGrid}
          setSnapToGrid={setSnapToGrid}
          fit={() => {
            setZoom(0.75);
            setPan({ x: 0, y: 0 });
          }}
        />
      </section>
    </div>
  );
}

function PanelHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
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

function IconBtn({ icon: Icon }: { icon: typeof Plus }) {
  return <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><Icon className="h-3.5 w-3.5" /></button>;
}

function DrillDownTree() {
  return (
    <div className="p-4 text-sm">
      <TreeRow label="TAM — Horizontal" depth={0} root />
      <TreeRow label="Tech" depth={1} />
      <TreeRow label="Software" depth={2} />
      <TreeRow label="Development & Deployment" depth={3} />
      <TreeRow label="Analytics & Business Intelligence Software" depth={4} disabled />
      <TreeRow label="Snowflake Inc. ($541M)" depth={5} disabled leaf />
      <TreeRow label="Datadog, Inc. ($279M)" depth={5} disabled leaf />
      <TreeRow label="Salesforce, Inc. ($429M)" depth={5} disabled leaf />
      <TreeRow label="Oracle Corporation ($409M)" depth={5} disabled leaf />
      <TreeRow label="Microsoft Corporation ($757M)" depth={5} disabled leaf />
      <TreeRow label="IAM" depth={4} active />
      <TreeRow label="Okta ($2,260M)" depth={5} active leaf />
      <TreeRow label="Network Security" depth={4} disabled />
      <TreeRow label="Fortinet ($5,300M)" depth={5} disabled leaf />
    </div>
  );
}

function TreeRow({ label, depth, active, disabled, root, leaf }: { label: string; depth: number; active?: boolean; disabled?: boolean; root?: boolean; leaf?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded px-1 py-1.5",
        active && "bg-blue-50 font-medium text-blue-600",
        disabled && "cursor-not-allowed opacity-35",
        root && "font-semibold text-mds-navy",
      )}
      style={{ paddingLeft: depth * 12 }}
      title={disabled ? "Coming soon" : undefined}
    >
      {leaf ? <span className="w-3" /> : <ChevronRight className="h-3 w-3 rotate-90 text-muted-foreground" />}
      <span>{label}</span>
    </div>
  );
}

function TopSummary({ tam, boxCount, linkCount, timeframe }: { tam: string; boxCount: number; linkCount: number; timeframe: string }) {
  return (
    <div className="z-20 border-b bg-slate-900 px-6 py-4 text-white shadow-sm">
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-green-300">TAM</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{tam}</div>
          <div className="mt-1 text-xs text-white/65">IAM · US · {timeframe}</div>
          <div className="mt-2 text-xs text-white/70">▸ {boxCount} boxes · {linkCount} links</div>
        </div>
        <div className="opacity-35">
          <div className="text-xs uppercase tracking-[0.12em]">SAM</div>
          <div className="mt-1 text-3xl font-bold">—</div>
          <div className="mt-1 text-xs">Coming soon</div>
        </div>
        <div className="opacity-35">
          <div className="text-xs uppercase tracking-[0.12em]">Vended SAM</div>
          <div className="mt-1 text-3xl font-bold">—</div>
          <div className="mt-1 text-xs">Coming soon</div>
        </div>
      </div>
    </div>
  );
}

function ConnectionLayer({ boxes, connections }: { boxes: CanvasBox[]; connections: Connection[] }) {
  return (
    <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#94A3B8" />
        </marker>
      </defs>
      {connections.map((connection) => {
        const from = boxes.find((box) => box.id === connection.from);
        const to = boxes.find((box) => box.id === connection.to);
        if (!from || !to) return null;
        const start = { x: from.x + boxWidth(from), y: from.y + BOX_HEIGHT / 2 };
        const end = { x: to.x, y: to.y + BOX_HEIGHT / 2 };
        const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        const c = Math.max(80, Math.abs(end.x - start.x) * 0.45);
        return (
          <g key={connection.id} className={connection.preview ? "opacity-35" : undefined}>
            <path
              d={`M ${start.x} ${start.y} C ${start.x + c} ${start.y}, ${end.x - c} ${end.y}, ${end.x} ${end.y}`}
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              markerEnd="url(#arrow)"
            />
            <circle cx={mid.x} cy={mid.y} r="18" fill="#1e293b" />
            <text x={mid.x} y={mid.y + 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="white">
              {connection.operator}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CanvasBoxCard({
  box,
  selected,
  expanded,
  linkedInputs,
  outgoing,
  onMouseDown,
  onClick,
  onChange,
  onCommit,
}: {
  box: CanvasBox;
  selected: boolean;
  expanded: boolean;
  linkedInputs: LinkedInput[];
  outgoing: Connection[];
  onMouseDown: (event: ReactMouseEvent) => void;
  onClick: () => void;
  onChange: (value: string) => void;
  onCommit: () => void;
}) {
  const style = BOX_STYLE[box.type];
  const editable = box.type !== "calculation" && !box.preview;
  return (
    <div
      className={cn(
        "absolute rounded-lg border border-slate-200 border-l-4 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
        style.border,
        box.type === "calculation" && "bg-green-50",
        box.preview && "opacity-35",
        selected && "ring-2 ring-slate-800",
      )}
      style={{ left: box.x, top: box.y, width: boxWidth(box), minHeight: BOX_HEIGHT }}
      onMouseDown={onMouseDown}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <div className="absolute -left-1 top-1/2 hidden h-3 w-3 -translate-x-1/2 rounded-full border border-slate-400 bg-white group-hover:block" />
      <div className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full border border-slate-400 bg-white" />
      <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-400 bg-white" />
      <div className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full border border-slate-400 bg-white" />

      <div className="flex items-center justify-between">
        <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide", box.preview && "after:ml-2 after:content-['Coming_soon']")}>
          <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
          {style.label}
        </span>
        <button className="rounded px-1 text-slate-400 hover:bg-slate-100">⋮</button>
      </div>
      <div className="mt-4 text-[13px] font-semibold text-slate-800">{box.title}</div>
      <div className="mt-3">
        {editable ? (
          <Input
            value={box.value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onCommit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className={cn("h-11 text-center text-lg font-bold tabular-nums", style.ring)}
          />
        ) : (
          <div className="rounded-md bg-white px-3 py-2 text-center text-[22px] font-bold tabular-nums text-slate-900">{box.value}</div>
        )}
      </div>
      {box.type === "calculation" && <div className="mt-3 rounded bg-green-100 px-2 py-1 font-mono text-[11px] text-green-800">{formulaFor(box.id)}</div>}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{box.description}</p>
      <p className="mt-2 text-[10px] italic text-slate-400">Source: {box.source}</p>
      {box.type === "calculation" && (
        <button className="mt-3 text-[11px] font-medium text-green-700">{expanded ? "▲ Hide linked inputs" : "▼ View linked inputs"}</button>
      )}
      {expanded && (
        <LinkedInputsPanel inputs={linkedInputs} outgoing={outgoing} />
      )}
    </div>
  );
}

type LinkedInput = { type: BoxType; label: string; value: string };

function LinkedInputsPanel({ inputs, outgoing }: { inputs: LinkedInput[]; outgoing: Connection[] }) {
  return (
    <div className="mt-3 rounded-md border bg-white/80 p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Linked Inputs</div>
      {inputs.map((input) => (
        <div key={input.label} className="flex items-center justify-between gap-3 py-1 text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className={cn("h-2 w-2 rounded-full", BOX_STYLE[input.type].dot)} />
            {input.label}
          </span>
          <span className="font-semibold tabular-nums text-slate-800">{input.value}</span>
        </div>
      ))}
      {outgoing.length > 0 && <div className="mt-2 border-t pt-2 text-[11px] text-slate-500">Output flows to: {outgoing.map((item) => item.to).join(", ")}</div>}
    </div>
  );
}

function PreviewFormula({ tam, sam, vendedSam }: { tam: number; sam: number; vendedSam: number }) {
  return (
    <div className="absolute left-[180px] top-[790px] w-[1080px] rounded-xl border border-dashed border-slate-300 bg-white/70 p-5 opacity-35">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Preview Only · Coming soon</div>
      <div className="text-sm text-slate-700">SAM: TAM × % Serviceable Companies = {formatCurrencyB(sam)}</div>
      <div className="mt-2 text-sm text-slate-700">Vended SAM: SAM × Seat Adoption Rate = {formatCurrencyB(vendedSam)}</div>
      <div className="mt-2 text-[11px] text-slate-500">Current TAM reference: {formatCurrencyB(tam)}</div>
    </div>
  );
}

function Legend({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  if (collapsed) {
    return (
      <button className="absolute right-4 top-4 z-20 rounded-lg border bg-white p-3 shadow-sm" onClick={onToggle}>
        <span className="inline-flex gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /><span className="h-2.5 w-2.5 rounded-full bg-red-600" /><span className="h-2.5 w-2.5 rounded-full bg-green-600" /></span>
      </button>
    );
  }
  return (
    <div className="absolute right-4 top-4 z-20 w-52 rounded-lg border bg-white p-4 text-xs shadow-sm">
      <button className="absolute right-2 top-1 text-slate-400" onClick={onToggle}>×</button>
      <LegendRow color="bg-blue-600" title="Data Input" body="Editable. External sourced." />
      <LegendRow color="bg-red-600" title="Assumption" body="Editable. User-set estimate." />
      <LegendRow color="bg-green-600" title="Calculation" body="Read-only. Computed from links." />
    </div>
  );
}

function LegendRow({ color, title, body }: { color: string; title: string; body: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-2 font-semibold text-slate-700"><span className={cn("h-2.5 w-2.5 rounded-full", color)} />{title}</div>
      <div className="ml-4 mt-0.5 text-slate-500">{body}</div>
    </div>
  );
}

function MiniMap({ boxes }: { boxes: CanvasBox[] }) {
  return (
    <div className="absolute bottom-20 right-4 z-20 h-28 w-44 rounded-lg border bg-white/90 p-2 shadow-sm">
      <div className="relative h-full w-full bg-slate-100">
        {boxes.map((box) => (
          <div
            key={box.id}
            className={cn("absolute h-2 w-4 rounded-sm", BOX_STYLE[box.type].dot, box.preview && "opacity-35")}
            style={{ left: box.x / 12, top: box.y / 12 }}
          />
        ))}
      </div>
    </div>
  );
}

function Toolbar({
  activeOperator,
  setActiveOperator,
  connectMode,
  setConnectMode,
  addBox,
  undo,
  redo,
  zoom,
  setZoom,
  showGrid,
  setShowGrid,
  snapToGrid,
  setSnapToGrid,
  fit,
}: {
  activeOperator: Operator;
  setActiveOperator: (operator: Operator) => void;
  connectMode: boolean;
  setConnectMode: (enabled: boolean) => void;
  addBox: () => void;
  undo: () => void;
  redo: () => void;
  zoom: number;
  setZoom: (updater: (zoom: number) => number) => void;
  showGrid: boolean;
  setShowGrid: (enabled: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (enabled: boolean) => void;
  fit: () => void;
}) {
  return (
    <div className="z-20 flex flex-wrap items-center gap-3 border-t bg-white px-5 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
      <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" onClick={addBox}>+ Add Box</button>
      <Divider />
      <div className="flex gap-2">
        {OPERATORS.map((operator) => (
          <button
            key={operator}
            className={cn("grid h-9 w-9 place-items-center rounded-full border border-slate-800 text-sm font-bold", activeOperator === operator ? "bg-slate-800 text-white" : "bg-white text-slate-800")}
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/plain", operator)}
            onClick={() => setActiveOperator(operator)}
          >
            {operator}
          </button>
        ))}
      </div>
      <Divider />
      <button className={cn("rounded-md border px-3 py-2 text-sm", connectMode && "bg-blue-50 text-blue-700")} onClick={() => setConnectMode(!connectMode)}>⟶ Connect</button>
      <Divider />
      <button className="rounded-md border px-3 py-2 text-sm" onClick={undo}>Undo</button>
      <button className="rounded-md border px-3 py-2 text-sm" onClick={redo}>Redo</button>
      <Divider />
      <button className="grid h-8 w-8 place-items-center rounded-md border" onClick={() => setZoom((current) => clamp(current - 0.1, 0.25, 2))}><Minus className="h-4 w-4" /></button>
      <span className="w-12 text-center text-sm font-medium">{Math.round(zoom * 100)}%</span>
      <button className="grid h-8 w-8 place-items-center rounded-md border" onClick={() => setZoom((current) => clamp(current + 0.1, 0.25, 2))}><Plus className="h-4 w-4" /></button>
      <button className="rounded-md border px-3 py-2 text-sm" onClick={fit}>Fit</button>
      <Divider />
      <button className={cn("rounded-md border px-3 py-2 text-sm", showGrid && "bg-slate-100")} onClick={() => setShowGrid(!showGrid)}>Grid</button>
      <button className={cn("rounded-md border px-3 py-2 text-sm", snapToGrid && "bg-slate-100")} onClick={() => setSnapToGrid(!snapToGrid)}>Snap</button>
    </div>
  );
}

function Divider() {
  return <div className="h-7 w-px bg-slate-200" />;
}

function calculateMetrics(boxes: CanvasBox[]) {
  const users = numericBox(boxes, "users");
  const spend = numericBox(boxes, "spend");
  const companies = numericBox(boxes, "companies");
  const serviceable = numericBox(boxes, "serviceable") / 100;
  const adoption = numericBox(boxes, "adoption") / 100;
  const perCompany = users * spend;
  const tam = companies * perCompany;
  const sam = tam * serviceable;
  const vendedSam = sam * adoption;
  return { users, spend, companies, serviceable, adoption, perCompany, tam, sam, vendedSam };
}

function applyCalculatedValues(boxes: CanvasBox[], metrics: ReturnType<typeof calculateMetrics>) {
  return boxes.map((box) => {
    if (box.id === "perCompany") return { ...box, value: formatCurrency(metrics.perCompany) };
    if (box.id === "tam") return { ...box, value: formatCurrencyB(metrics.tam) };
    if (box.id === "sam") return { ...box, value: formatCurrencyB(metrics.sam) };
    if (box.id === "vendedSam") return { ...box, value: formatCurrencyB(metrics.vendedSam) };
    return box;
  });
}

function getLinkedInputs(box: CanvasBox, boxes: CanvasBox[], connections: Connection[], metrics: ReturnType<typeof calculateMetrics>): LinkedInput[] {
  const incoming = connections.filter((connection) => connection.to === box.id);
  const inputRows = incoming.map((connection) => {
    const source = boxes.find((item) => item.id === connection.from);
    return source ? { type: source.type, label: source.title, value: source.value } : null;
  }).filter(Boolean) as LinkedInput[];
  if (box.id === "perCompany") return [...inputRows, { type: "calculation", label: "Substituted", value: `${formatNumber(metrics.users)} × ${formatCurrency(metrics.spend)} = ${formatCurrency(metrics.perCompany)}` }];
  if (box.id === "tam") return [...inputRows, { type: "calculation", label: "Substituted", value: `${formatNumber(metrics.companies)} × ${formatCurrency(metrics.perCompany)} = ${formatCurrencyB(metrics.tam)}` }];
  return inputRows;
}

function numericBox(boxes: CanvasBox[], id: BoxId) {
  return parseEditableNumber(boxes.find((box) => box.id === id)?.value ?? "0");
}

function formatBoxValue(box: CanvasBox) {
  const value = parseEditableNumber(box.value);
  if (box.id === "spend") return formatNumber(value);
  if (box.id === "serviceable" || box.id === "adoption") return formatNumber(value);
  return formatNumber(value);
}

function formulaFor(id: BoxId) {
  if (id === "perCompany") return "= Users × Spend/Seat";
  if (id === "tam") return "= Companies × $/Company";
  if (id === "sam") return "= TAM × Serviceable %";
  if (id === "vendedSam") return "= SAM × Adoption";
  return "= Linked inputs";
}

function boxWidth(box: CanvasBox) {
  return box.width ?? 240;
}

function snap(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseEditableNumber(value: string) {
  const parsed = Number(value.replace(/[$,%\s/yr]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: value % 1 === 0 ? 0 : 1 });
}

function formatCurrency(value: number) {
  return `$${formatNumber(value)}`;
}

function formatCurrencyB(value: number) {
  return `$${(value / 1_000_000_000).toFixed(2)}B`;
}
