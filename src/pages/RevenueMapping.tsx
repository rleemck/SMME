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
import { getFilingNarrativeExcerpt } from "@/lib/filingNarrative";
import { keywordsForSegments } from "@/services/evidenceBuilder";
import { SecStatusBadge } from "@/components/sec/SecStatusBadge";
import { SecMockBanner } from "@/components/sec/SecMockBanner";
import { PageShell } from "@/components/layout/PageShell";

const TH = "min-w-0 whitespace-normal break-words leading-snug";

export default function RevenueMapping() {
  const {
    includedVendors,
    updateVendor,
    tam,
    baseRevenue,
    vendorUniverseSummary,
    selectedSegments,
  } = useModel();
  const filingKeywords = keywordsForSegments(selectedSegments);
  const navigate = useNavigate();
  const included = includedVendors;

  const patchRevenue = (id: string, patch: Parameters<typeof updateVendor>[1]) => {
    const v = included.find((x) => x.id === id);
    if (!v) return;
    updateVendor(id, applySegmentRevenueFromShare(v, patch));
  };

  return (
    <PageShell className="revenue-mapping-page">
      <div className="mb-4">
        <SecMockBanner />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <div className="mds-eyebrow mb-1">Step 2 · Revenue mapping</div>
          <h1 className="text-2xl font-semibold text-mds-navy break-words">
            Segment revenue attribution
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed break-words">
            {REVENUE_HELPER_TEXT} Showing {included.length} included vendor(s)
            {vendorUniverseSummary.excluded > 0
              ? ` (${vendorUniverseSummary.excluded} excluded at scoping).`
              : "."}
          </p>
        </div>
        <Button onClick={() => navigate("/model")} className="gap-2 shrink-0 self-start">
          Open Market Model Engine <ChevronRight className="h-4 w-4 shrink-0" />
        </Button>
      </div>

      <div className="revenue-kpi-grid">
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
            <span className="text-mds-success inline-flex flex-wrap items-center gap-1">
              <TrendingUp className="h-3 w-3 shrink-0" /> Bottom-up
            </span>
          }
        />
      </div>

      <p className="text-xs text-muted-foreground mb-2 break-words">
        Scroll horizontally to see all columns — text wraps inside each cell.
      </p>

      <div className="desktop-table-panel desktop-table-scroll scrollbar-visible w-full max-w-full">
        <Table className="desktop-data-table revenue-data-table">
          <TableHeader>
            <TableRow>
              <TableHead className={`${TH} min-w-[7rem]`}>Vendor</TableHead>
              <TableHead className={`${TH} min-w-[4rem]`}>Ticker</TableHead>
              <TableHead className={`${TH} min-w-[7rem] text-right`}>Total co. rev ($M)</TableHead>
              <TableHead className={`${TH} min-w-[3rem]`}>FY</TableHead>
              <TableHead className={`${TH} min-w-[4rem]`}>Filing</TableHead>
              <TableHead className={`${TH} min-w-[6rem]`}>Filing date</TableHead>
              <TableHead className={`${TH} min-w-[5rem]`}>SEC link</TableHead>
              <TableHead className={`${TH} min-w-[14rem]`}>10-K excerpt (Item 1)</TableHead>
              <TableHead className={`${TH} min-w-[6rem] text-right`}>Segment rev ($M)</TableHead>
              <TableHead className={`${TH} min-w-[9rem]`}>SEC status</TableHead>
              <TableHead className={`${TH} min-w-[12rem]`}>Confidence rationale</TableHead>
              <TableHead className={`${TH} min-w-[8rem]`}>Status</TableHead>
              <TableHead className={`${TH} min-w-[10rem]`}>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {included.map((v) => (
              <TableRow key={v.id} className="align-top">
                <TableCell className="font-medium break-words">{v.name}</TableCell>
                <TableCell className="font-mono text-xs break-all">{v.ticker}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    className="w-full max-w-[6.5rem] ml-auto text-right h-8"
                    value={v.totalCompanyRevenue ?? v.revenue}
                    onChange={(e) =>
                      patchRevenue(v.id, {
                        totalCompanyRevenue: Number(e.target.value),
                        revenue: Number(e.target.value),
                      })
                    }
                  />
                </TableCell>
                <TableCell className="text-xs break-words">
                  {v.fiscalYear ?? v.secRevenue?.fiscalYear ?? "—"}
                </TableCell>
                <TableCell className="text-xs break-words">
                  {v.filingType ?? v.secRevenue?.formType ?? "—"}
                </TableCell>
                <TableCell className="text-xs break-words">
                  {v.secRevenue?.filingDate ?? "—"}
                </TableCell>
                <TableCell className="break-words">
                  {v.filingUrl ? (
                    <a
                      href={v.filingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-wrap items-center gap-1 text-mds-blue text-xs hover:underline"
                    >
                      View <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="cell-prose-fluid">
                  <TextExpandable
                    text={getFilingNarrativeExcerpt(v.secRevenue, filingKeywords, 360) || "—"}
                    maxChars={480}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    className="w-full max-w-[6.5rem] ml-auto text-right h-8"
                    value={v.segmentRevenue ?? 0}
                    onChange={(e) => updateVendor(v.id, { segmentRevenue: Number(e.target.value) })}
                  />
                </TableCell>
                <TableCell className="min-w-[9rem]">
                  <SecStatusBadge status={v.secDataStatus} retrievedAt={v.secRetrievedAt} compact />
                </TableCell>
                <TableCell className="cell-prose-fluid">
                  <TextExpandable
                    text={v.confidenceRationale ?? v.rationale ?? ""}
                    maxChars={400}
                  />
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
                    <SelectTrigger className="h-auto min-h-8 w-full min-w-[8.5rem] py-1.5 whitespace-normal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mapped">Mapped</SelectItem>
                      <SelectItem value="needs_review">Needs review</SelectItem>
                      <SelectItem value="excluded">Excluded</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Textarea
                    rows={2}
                    className="min-h-[3.5rem] text-sm w-full min-w-[10rem] resize-y break-words"
                    value={v.notes ?? ""}
                    onChange={(e) => updateVendor(v.id, { notes: e.target.value })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {included.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center break-words">
            No vendors included. Return to Scoping Expert and include at least one vendor.
          </p>
        )}
      </div>
    </PageShell>
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
    <div className={`mds-kpi min-w-0 ${accent ? "bg-mds-navy text-white border-mds-navy" : ""}`}>
      <div
        className={`text-xs break-words ${accent ? "text-white/70" : "text-muted-foreground"}`}
      >
        {label}
      </div>
      <div
        className={`text-2xl font-semibold mt-2 tabular-nums break-words ${
          accent ? "text-white" : "text-mds-navy"
        }`}
      >
        {value}
      </div>
      <div
        className={`text-xs mt-1 break-words ${accent ? "text-white/80" : "text-muted-foreground"}`}
      >
        {sub}
      </div>
    </div>
  );
}
