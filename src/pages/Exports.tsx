import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useModel, fmtUsdB } from "@/store/ModelStore";
import { exportModelWorkbook } from "@/services/excelExportService";
import { FileSpreadsheet, Download, FileText } from "lucide-react";

const OUTPUTS = [
  { id: "exec", label: "Executive Summary", desc: "1-page TAM + key drivers" },
  { id: "rev", label: "Vendor Revenue Mapping", desc: "Normalized revenue by segment" },
  { id: "asum", label: "Assumptions", desc: "All variables with sources" },
  { id: "tree", label: "Issue Tree", desc: "Hierarchical decomposition" },
  { id: "formula", label: "Formula Relationships", desc: "Visual formula graph" },
  { id: "dict", label: "Data Dictionary", desc: "Field-level definitions" },
];

export default function Exports() {
  const { vendors, assumptions, tam, tamBreakdown, market, primarySegment, adjacentSegments } = useModel();
  const [sel, setSel] = useState<Record<string, boolean>>(Object.fromEntries(OUTPUTS.map((o) => [o.id, true])));
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");

  return (
    <div className="p-8 animate-fade-in">
      <div className="mds-eyebrow mb-1">Export Center</div>
      <h1 className="text-2xl font-semibold text-mds-navy mb-6">Export market model</h1>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 space-y-4">
          <div className="rounded-lg border bg-card shadow-sm p-5">
            <h3 className="text-sm font-semibold text-mds-navy mb-3">Outputs</h3>
            <div className="space-y-3">
              {OUTPUTS.map((o) => (
                <label key={o.id} className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={sel[o.id]} onCheckedChange={(v) => setSel({ ...sel, [o.id]: !!v })} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{o.label}</div>
                    <div className="text-xs text-muted-foreground">{o.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card shadow-sm p-5">
            <h3 className="text-sm font-semibold text-mds-navy mb-3">Format</h3>
            <div className="grid grid-cols-2 gap-2">
              <FormatBtn active={format === "xlsx"} onClick={() => setFormat("xlsx")} icon={FileSpreadsheet} label="Excel" />
              <FormatBtn active={format === "csv"} onClick={() => setFormat("csv")} icon={FileText} label="CSV" />
            </div>
            <Button
              className="w-full mt-4 gap-2"
              onClick={() =>
                exportModelWorkbook({
                  marketName: market.name,
                  dataSource: market.dataSource,
                  timeframe: market.timeframe,
                  primarySegment,
                  adjacentSegments,
                  vendors,
                  assumptions,
                  tam: tamBreakdown,
                })
              }
            >
              <Download className="h-4 w-4" /> Generate Export
            </Button>
          </div>
        </div>

        <div className="col-span-8">
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between bg-surface-muted">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-mds-success" />
                <span className="text-sm font-semibold">{market.name.replace(/\s+/g, "_")}_Model.{format}</span>
              </div>
              <span className="text-xs text-muted-foreground">Workbook preview</span>
            </div>
            <div className="border-b bg-card flex text-xs">
              {["Summary", "Vendors", "Assumptions", "Issue Tree", "Formulas"].map((t, i) => (
                <div key={t} className={`px-4 py-2 border-r ${i === 0 ? "bg-surface-muted font-semibold" : "text-muted-foreground"}`}>{t}</div>
              ))}
            </div>
            <div className="p-6 mds-grid-bg min-h-[420px]">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b bg-mds-navy text-white">
                    <td className="px-3 py-2 font-semibold" colSpan={2}>{market.name} — TAM Model</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-2 text-muted-foreground">Data source</td>
                    <td className="px-3 py-2 font-medium">{market.dataSource}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-2 text-muted-foreground">Timeframe</td>
                    <td className="px-3 py-2 font-medium">{market.timeframe}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-2 text-muted-foreground">Vendors included</td>
                    <td className="px-3 py-2 font-medium tabular-nums">{vendors.filter(v => v.status === "Included").length}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-2 text-muted-foreground">Assumptions tracked</td>
                    <td className="px-3 py-2 font-medium tabular-nums">{assumptions.length}</td>
                  </tr>
                  <tr className="border-b bg-mds-blue/5">
                    <td className="px-3 py-2 font-semibold text-mds-navy">Final TAM</td>
                    <td className="px-3 py-2 font-bold text-mds-navy tabular-nums">{fmtUsdB(tam)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-6 text-xs text-muted-foreground italic">+ {Object.values(sel).filter(Boolean).length - 1} additional sheets will be generated…</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormatBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-md border transition ${active ? "border-mds-blue bg-mds-blue/5 text-mds-blue" : "bg-surface-muted hover:bg-secondary"}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
