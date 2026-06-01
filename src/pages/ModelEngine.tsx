import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useModel, fmtUsdB, fmtUsdM } from "@/store/ModelStore";
import { exportModelWorkbook } from "@/services/excelExportService";
import { Download } from "lucide-react";
import { Plus, Trash2, Edit3, TrendingUp, Sparkles, ChevronRight } from "lucide-react";
import { IssueNode } from "@/lib/mockData";
import AssumptionEditor from "@/components/AssumptionEditor";

export default function ModelEngine() {
  const {
    vendors,
    updateVendor: patchVendor,
    assumptions,
    setAssumption,
    tree,
    tam,
    tamBreakdown,
    market,
    primarySegment,
    adjacentSegments,
  } = useModel();
  const [editorOpen, setEditorOpen] = useState(false);

  const updateVendor = (id: string, key: string, val: unknown) =>
    patchVendor(id, { [key]: val } as Parameters<typeof patchVendor>[1]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-6 pb-4 border-b bg-card">
        <div className="flex items-end justify-between">
          <div>
            <div className="mds-eyebrow mb-1">Step 3 · Market Model Engine</div>
            <h1 className="text-2xl font-semibold text-mds-navy">Modeling workspace</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                exportModelWorkbook({
                  marketName: market.name,
                  geography: market.geography,
                  timeframe: market.timeframe,
                  primarySegment,
                  adjacentSegments,
                  vendors,
                  assumptions,
                  tam: tamBreakdown,
                })
              }
            >
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={() => setEditorOpen(true)} variant="outline" className="gap-2">
              <Edit3 className="h-4 w-4" /> Assumption Editor
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-0 flex-1 min-h-0">
        {/* Left Panel: Issue Tree */}
        <div className="col-span-3 border-r bg-card overflow-y-auto">
          <PanelHeader title="Issue Tree" actions={<><IconBtn icon={Plus} /><IconBtn icon={Edit3} /><IconBtn icon={Trash2} /></>} />
          <div className="p-4">
            <TreeView node={tree} depth={0} />
          </div>
        </div>

        {/* Center Panel: Model Table */}
        <div className="col-span-6 overflow-y-auto bg-surface-muted">
          <PanelHeader title="Model Table" sub="Inline edit revenue, growth, share" />
          <div className="p-5 space-y-5">
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                    <TableHead className="text-right">Growth</TableHead>
                    <TableHead className="text-right">Adjusted TAM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => {
                    const adj = (v.revenue / Math.max(penetration / 100, 0.01)) * (1 + growth / 100) * expansion / 1000;
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{v.segment}</TableCell>
                        <TableCell className="text-right">
                          <CellInput value={v.revenue} onChange={(n) => updateVendor(v.id, "revenue", n)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <CellInput value={v.share} onChange={(n) => updateVendor(v.id, "share", n)} suffix="%" />
                        </TableCell>
                        <TableCell className="text-right">
                          <CellInput value={v.growth} onChange={(n) => updateVendor(v.id, "growth", n)} suffix="%" />
                        </TableCell>
                        <TableCell className="text-right font-semibold text-mds-navy tabular-nums">${adj.toFixed(2)}B</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Formula Builder */}
            <div className="rounded-lg border bg-card shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-mds-navy">Formula Relationship Builder</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <FormulaBlock>Revenue</FormulaBlock>
                <Op>×</Op>
                <FormulaBlock accent>+ Private adj</FormulaBlock>
                <Op>+</Op>
                <FormulaBlock>Intl adj</FormulaBlock>
                <Op>=</Op>
                <FormulaBlock total>TAM</FormulaBlock>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Editable visual formula. Drag blocks to reorder · click to bind to an assumption · right-click to duplicate.
              </div>
            </div>

            {/* Big TAM card */}
            <div className="rounded-lg border bg-mds-navy text-white shadow-sm p-6 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-white/60">Final TAM Estimate</div>
                <div className="text-4xl font-bold mt-2 tabular-nums">{fmtUsdB(tam)}</div>
                <div className="mt-2 inline-flex items-center gap-1 text-mds-blue-light text-sm">
                  <TrendingUp className="h-4 w-4" /> Vendor sum {fmtUsdM(tamBreakdown.vendorRevenueSum)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/60 uppercase tracking-wide">Live recalculation</div>
                <div className="text-sm text-white/80 mt-1">{vendors.filter(v => v.status === "Included").length} vendors · {assumptions.length} assumptions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Assumptions */}
        <div className="col-span-3 border-l bg-card overflow-y-auto">
          <PanelHeader title="Assumptions" sub="Live recalculation enabled" />
          <div className="p-4 space-y-3">
            {assumptions.map((a) => (
              <div key={a.id} className="rounded-md border p-3 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-mds-navy">{a.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Source: {a.source}</div>
                  </div>
                  <Switch checked={a.editable} />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Input
                    type="number"
                    step={a.unit === "x" ? 0.05 : 1}
                    value={a.value}
                    onChange={(e) => setAssumption(a.id, Number(e.target.value))}
                    className="h-8 text-right tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground w-4">{a.unit}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{a.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AssumptionEditor open={editorOpen} onOpenChange={setEditorOpen} />
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
function CellInput({ value, onChange, suffix }: any) {
  return (
    <div className="inline-flex items-center gap-0.5">
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-7 w-20 text-right tabular-nums text-sm" />
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}
function FormulaBlock({ children, accent, total }: any) {
  const cls = total ? "bg-mds-navy text-white border-mds-navy" : accent ? "bg-mds-blue text-white border-mds-blue" : "bg-surface-muted border-border";
  return <span className={`px-3 py-2 rounded-md border text-sm font-medium ${cls}`}>{children}</span>;
}
function Op({ children }: any) {
  return <span className="text-muted-foreground font-mono">{children}</span>;
}

function TreeView({ node, depth }: { node: IssueNode; depth: number }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 py-1 text-sm" style={{ paddingLeft: depth * 12 }}>
        {node.children?.length ? <ChevronRight className="h-3 w-3 text-muted-foreground rotate-90" /> : <span className="w-3" />}
        <span className={depth === 0 ? "font-semibold text-mds-navy" : "text-foreground"}>{node.label}</span>
      </div>
      {node.children?.map((c) => <TreeView key={c.id} node={c} depth={depth + 1} />)}
    </div>
  );
}
