import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useModel, fmtUsdB, fmtUsdM, REVENUE_HELPER_TEXT } from "@/store/ModelStore";
import { applySegmentRevenueFromShare } from "@/lib/vendorRevenue";
import { TrendingUp, ChevronRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { MappingStatus } from "@/types/taxonomy";
import { TextExpandable } from "@/components/taxonomy/TextExpandable";
import { SecStatusBadge } from "@/components/sec/SecStatusBadge";
import { SecMockBanner } from "@/components/sec/SecMockBanner";

export default function RevenueMapping() {
  const {
    includedVendors,
    updateVendor,
    tam,
    baseRevenue,
    primarySegment,
    vendorUniverseSummary,
  } = useModel();
  const navigate = useNavigate();
  const included = includedVendors;

  const patchRevenue = (id: string, patch: Parameters<typeof updateVendor>[1]) => {
    const v = included.find((x) => x.id === id);
    if (!v) return;
    updateVendor(id, applySegmentRevenueFromShare(v, patch));
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-4">
        <SecMockBanner />
      </div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="mds-eyebrow mb-1">Step 2 · Revenue mapping</div>
          <h1 className="text-2xl font-semibold text-mds-navy">Segment revenue attribution</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {REVENUE_HELPER_TEXT} Showing {included.length} included vendor(s)
            {vendorUniverseSummary.excluded > 0
              ? ` (${vendorUniverseSummary.excluded} excluded at scoping).`
              : "."}
          </p>
        </div>
        <Button onClick={() => navigate("/model")} className="gap-2">
          Open Market Model Engine <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Kpi label="Vendors included" value={`${included.length}`} sub={`${vendorUniverseSummary.total} in universe`} />
        <Kpi
          label="Avg confidence"
          value={`${Math.round((included.reduce((s, v) => s + v.confidence, 0) / Math.max(included.length, 1)) * 100)}%`}
          sub="SEC-backed"
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
              <TableHead>Vendor</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead className="text-right">Total co. rev ($M)</TableHead>
              <TableHead>FY</TableHead>
              <TableHead>Filing</TableHead>
              <TableHead>Filing date</TableHead>
              <TableHead>SEC link</TableHead>
              <TableHead>XBRL tag</TableHead>
              <TableHead className="min-w-[160px]">Source excerpt</TableHead>
              <TableHead className="text-right">Est. share</TableHead>
              <TableHead className="text-right">Segment rev ($M)</TableHead>
              <TableHead>SEC status</TableHead>
              <TableHead className="min-w-[180px]">Confidence rationale</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {included.map((v) => (
              <TableRow key={v.id} className="align-top">
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="font-mono text-xs">{v.ticker}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    className="w-24 ml-auto text-right h-8"
                    value={v.totalCompanyRevenue ?? v.revenue}
                    onChange={(e) =>
                      patchRevenue(v.id, {
                        totalCompanyRevenue: Number(e.target.value),
                        revenue: Number(e.target.value),
                      })
                    }
                  />
                </TableCell>
                <TableCell className="text-xs">{v.fiscalYear ?? v.secRevenue?.fiscalYear ?? "—"}</TableCell>
                <TableCell className="text-xs">{v.filingType ?? v.secRevenue?.formType}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{v.secRevenue?.filingDate ?? "—"}</TableCell>
                <TableCell>
                  {v.filingUrl ? (
                    <a
                      href={v.filingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-mds-blue text-xs hover:underline"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-[10px] font-mono max-w-[100px] truncate" title={v.revenueMetric}>
                  {v.revenueMetric ?? "—"}
                </TableCell>
                <TableCell className="max-w-[180px]">
                  <TextExpandable text={v.secRevenue?.sourceExcerpt ?? ""} maxChars={200} />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    className="w-16 ml-auto text-right h-8"
                    step={0.01}
                    min={0}
                    max={1}
                    value={v.segmentShare ?? v.share / 100}
                    onChange={(e) => patchRevenue(v.id, { segmentShare: Number(e.target.value) })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    className="w-24 ml-auto text-right h-8"
                    value={v.segmentRevenue ?? 0}
                    onChange={(e) => updateVendor(v.id, { segmentRevenue: Number(e.target.value) })}
                  />
                </TableCell>
                <TableCell>
                  <SecStatusBadge status={v.secDataStatus} retrievedAt={v.secRetrievedAt} compact />
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <TextExpandable text={v.confidenceRationale ?? v.rationale ?? ""} />
                </TableCell>
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
                <TableCell className="min-w-[120px]">
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
        {included.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">
            No vendors included. Return to Scoping Expert and include at least one vendor.
          </p>
        )}
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
