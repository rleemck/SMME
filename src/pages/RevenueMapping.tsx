import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useModel, fmtUsdB, fmtUsdM } from "@/store/ModelStore";
import { TrendingUp, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { MappingStatus } from "@/types/taxonomy";

export default function RevenueMapping() {
  const { vendors, updateVendor, tam, baseRevenue, primarySegment } = useModel();
  const navigate = useNavigate();
  const included = vendors.filter((v) => v.status === "Included" && v.mappingStatus !== "excluded");

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="mds-eyebrow mb-1">Step 2 · Revenue mapping</div>
          <h1 className="text-2xl font-semibold text-mds-navy">Segment revenue attribution</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Map public filing revenue to {primarySegment?.name ?? "selected segment"} with overrides and
            review status.
          </p>
        </div>
        <Button onClick={() => navigate("/model")} className="gap-2">
          Open Market Model Engine <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Kpi label="Vendors included" value={`${included.length}`} sub={`${vendors.length} total`} />
        <Kpi
          label="Avg confidence"
          value={`${Math.round((included.reduce((s, v) => s + v.confidence, 0) / Math.max(included.length, 1)) * 100)}%`}
          sub="Attribution"
        />
        <Kpi label="Segment revenue sum" value={fmtUsdM(baseRevenue)} sub="Included vendors" />
        <Kpi
          accent
          label="Preliminary TAM"
          value={fmtUsdB(tam)}
          sub={
            <span className="text-mds-success inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Bottom-up
            </span>
          }
        />
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Exchange</TableHead>
              <TableHead>Filing</TableHead>
              <TableHead>FY</TableHead>
              <TableHead className="text-right">Total rev ($M)</TableHead>
              <TableHead className="text-right">Segment rev ($M)</TableHead>
              <TableHead className="text-right">Share</TableHead>
              <TableHead className="text-right">Confidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="font-mono text-xs">{v.ticker}</TableCell>
                <TableCell className="text-xs">{v.exchange ?? "—"}</TableCell>
                <TableCell className="text-xs">{v.filingSource ?? v.filingType}</TableCell>
                <TableCell>{v.fiscalYear ?? 2025}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    className="w-24 ml-auto text-right h-8"
                    value={v.revenue}
                    onChange={(e) => updateVendor(v.id, { revenue: Number(e.target.value) })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    className="w-24 ml-auto text-right h-8"
                    value={v.segmentRevenue ?? v.revenue}
                    onChange={(e) =>
                      updateVendor(v.id, { segmentRevenue: Number(e.target.value), revenue: Number(e.target.value) })
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    className="w-16 ml-auto text-right h-8"
                    step={0.01}
                    value={v.segmentShare ?? (v.share / 100).toFixed(2)}
                    onChange={(e) => updateVendor(v.id, { segmentShare: Number(e.target.value) })}
                  />
                </TableCell>
                <TableCell className="text-right">{Math.round(v.confidence * 100)}%</TableCell>
                <TableCell>
                  <Select
                    value={v.mappingStatus ?? "mapped"}
                    onValueChange={(val) =>
                      updateVendor(v.id, {
                        mappingStatus: val as MappingStatus,
                        status: val === "excluded" ? "Excluded" : "Included",
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mapped">Mapped</SelectItem>
                      <SelectItem value="needs_review">Needs review</SelectItem>
                      <SelectItem value="excluded">Excluded</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="min-w-[140px]">
                  <Textarea
                    rows={1}
                    className="min-h-8 text-xs"
                    value={v.notes ?? ""}
                    onChange={(e) => updateVendor(v.id, { notes: e.target.value })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`mds-kpi ${accent ? "bg-mds-navy text-white border-mds-navy" : ""}`}>
      <div className={`text-xs ${accent ? "text-white/70" : "text-muted-foreground"}`}>{label}</div>
      <div className={`text-2xl font-semibold mt-2 tabular-nums ${accent ? "text-white" : "text-mds-navy"}`}>
        {value}
      </div>
      <div className={`text-xs mt-1 ${accent ? "text-white/80" : "text-muted-foreground"}`}>{sub}</div>
    </div>
  );
}
