import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { Vendor } from "@/lib/mockData";
import { useModel } from "@/store/ModelStore";
import type { EvidenceCard } from "@/types/evidence";
import { buildStructuredConfidenceRationale, buildVendorEvidenceCards } from "@/services/evidenceBuilder";
import { computeConfidenceBreakdown } from "@/services/confidenceScoring";
import { isVendorIncluded } from "@/lib/vendorSelection";
import { EvidenceCardsExpandable } from "./EvidenceCardsExpandable";
import { ConfidenceBreakdownView } from "./ConfidenceBreakdownView";
import { ConfidenceRationaleExpandable } from "./ConfidenceRationaleExpandable";
import { VendorBulkControls } from "./VendorBulkControls";
import { SecStatusBadge } from "@/components/sec/SecStatusBadge";
import { ExternalLink } from "lucide-react";
import { fmtUsdM } from "@/store/ModelStore";

export function VendorRecommendationTable() {
  const { vendors, selectedSegments, setVendorIncluded, includeSelectedVendors, excludeSelectedVendors } =
    useModel();

  const filterScopingCards = (list: EvidenceCard[]) =>
    list.filter(
      (c) =>
        c.sourceType !== "TAXONOMY_MATCH" &&
        !(c.sourceType === "SEC_SEGMENT_DISCLOSURE" && /XBRL|total company revenue/i.test(c.excerpt)),
    );

  const resolveEvidenceCards = (v: Vendor): EvidenceCard[] => {
    const stored = filterScopingCards(v.evidenceCards ?? []);
    if (stored.length) return stored;
    if (!selectedSegments.length || !v.secRevenue) return [];
    return filterScopingCards(
      buildVendorEvidenceCards(v.name, v.secRevenue, selectedSegments, undefined, { forScoping: true }),
    );
  };

  const resolveConfidence = (v: Vendor, cards: EvidenceCard[]) => {
    if (!selectedSegments.length) {
      return {
        confidence: v.confidence,
        breakdown: v.confidenceBreakdown,
        rationale: v.confidenceRationaleDetailed ?? v.confidenceRationale ?? v.rationale ?? "",
      };
    }
    const breakdown = computeConfidenceBreakdown(
      selectedSegments,
      v.name,
      undefined,
      v.secRevenue,
    );
    const confidence = breakdown.finalConfidence;
    const rationale = buildStructuredConfidenceRationale(
      confidence,
      breakdown,
      cards,
      selectedSegments,
      { companyName: v.name, forScoping: true },
    );
    return { confidence, breakdown, rationale };
  };
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const allRowIds = useMemo(() => vendors.map((v) => v.id), [vendors]);
  const allSelected = vendors.length > 0 && selectedRowIds.size === vendors.length;
  const someSelected = selectedRowIds.size > 0 && !allSelected;
  const toggleSelectAll = (checked: boolean) => setSelectedRowIds(checked ? new Set(allRowIds) : new Set());
  const selectedIds = Array.from(selectedRowIds);

  return (
    <div className="desktop-table-panel">
      <VendorBulkControls />

      {selectedRowIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
          <span className="text-xs text-muted-foreground">{selectedRowIds.size} row(s) selected</span>
          <Button type="button" size="sm" variant="secondary" onClick={() => includeSelectedVendors(selectedIds)}>
            Include Selected
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => excludeSelectedVendors(selectedIds)}>
            Exclude Selected
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedRowIds(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      <div className="desktop-table-scroll scrollbar-visible">
        <Table className="desktop-data-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 cell-compact">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(c) => toggleSelectAll(c === true)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="cell-compact">Include</TableHead>
              <TableHead className="min-w-[8rem]">Company</TableHead>
              <TableHead className="cell-compact">Ticker</TableHead>
              <TableHead className="text-right cell-compact min-w-[5.5rem]">Confidence</TableHead>
              <TableHead className="cell-prose">Confidence rationale</TableHead>
              <TableHead className="cell-prose-wide">Evidence</TableHead>
              <TableHead className="min-w-[6rem]">SEC status</TableHead>
              <TableHead className="text-right cell-compact">Total co. rev</TableHead>
              <TableHead className="cell-compact">FY</TableHead>
              <TableHead className="min-w-[9rem]">Revenue tag</TableHead>
              <TableHead className="cell-compact">SEC filing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((v) => {
              const included = isVendorIncluded(v);
              const total =
                v.totalCompanyRevenue ??
                (v.revenue > 0 ? v.revenue : null);
              const cards = resolveEvidenceCards(v);
              const { confidence, breakdown, rationale } = resolveConfidence(v, cards);
              return (
                <TableRow
                  key={v.id}
                  className={`align-top ${selectedRowIds.has(v.id) ? "bg-mds-blue/5" : ""}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRowIds.has(v.id)}
                      onCheckedChange={(c) => {
                        setSelectedRowIds((prev) => {
                          const next = new Set(prev);
                          if (c) next.add(v.id);
                          else next.delete(v.id);
                          return next;
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Switch checked={included} onCheckedChange={(c) => setVendorIncluded(v.id, c)} />
                      <Badge variant={included ? "default" : "outline"} className="text-[10px]">
                        {included ? "Included" : "Excluded"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {v.name}
                    {v.manuallyOverridden && (
                      <span className="block text-[10px] text-muted-foreground">Manual override</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{v.ticker}</TableCell>
                  <TableCell>
                    <ConfidenceBreakdownView
                      confidence={confidence}
                      breakdown={breakdown}
                      needsReview={confidence < 0.8 || v.secDataStatus === "unavailable"}
                      segmentName={v.matchedSegment}
                    />
                  </TableCell>
                  <TableCell className="cell-prose">
                    <ConfidenceRationaleExpandable rationale={rationale} confidence={confidence} />
                  </TableCell>
                  <TableCell className="cell-prose-wide">
                    <EvidenceCardsExpandable
                      cards={cards}
                      companyName={v.name}
                      segmentName={v.matchedSegment}
                      secStatus={v.secDataStatus}
                      maxVisible={2}
                    />
                  </TableCell>
                  <TableCell>
                    <SecStatusBadge status={v.secDataStatus} retrievedAt={v.secRetrievedAt} />
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums cell-compact">
                    {total != null ? fmtUsdM(total) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{v.fiscalYear ?? v.secRevenue?.fiscalYear ?? "—"}</TableCell>
                  <TableCell className="text-xs font-mono break-all leading-snug">
                    {v.revenueMetric ?? "—"}
                  </TableCell>
                  <TableCell>
                    {v.filingUrl ? (
                      <a
                        href={v.filingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-mds-blue hover:underline"
                      >
                        {v.filingType} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {vendors.length === 0 && (
        <p className="p-6 text-sm text-muted-foreground text-center">
          Run Generate to populate vendors with live SEC total company revenue.
        </p>
      )}
    </div>
  );
}
