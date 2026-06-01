import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { Vendor } from "@/lib/mockData";
import { useModel } from "@/store/ModelStore";
import { isVendorIncluded } from "@/lib/vendorSelection";
import { EvidenceExpandable } from "./EvidenceExpandable";
import { ConfidenceBreakdownView } from "./ConfidenceBreakdownView";
import { TextExpandable } from "./TextExpandable";
import { VendorBulkControls } from "./VendorBulkControls";
import { SecStatusBadge } from "@/components/sec/SecStatusBadge";
import type { EvidenceItem } from "@/types/taxonomy";
import { ExternalLink } from "lucide-react";
import { fmtUsdM } from "@/store/ModelStore";

function vendorEvidence(v: Vendor): EvidenceItem[] {
  if (v.evidenceItems?.length) return v.evidenceItems;
  const sec = v.secRevenue;
  if (sec?.sourceExcerpt) {
    return [
      {
        text: sec.sourceExcerpt,
        section: `SEC ${sec.formType}`,
        filingUrl: sec.filingUrl,
        formType: sec.formType,
        fiscalYear: sec.fiscalYear,
        filingDate: sec.filingDate,
      },
    ];
  }
  return (v.supportingEvidence ?? []).map((text) => ({ text }));
}

export function VendorRecommendationTable() {
  const { vendors, setVendorIncluded, includeSelectedVendors, excludeSelectedVendors } = useModel();
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const allRowIds = useMemo(() => vendors.map((v) => v.id), [vendors]);
  const allSelected = vendors.length > 0 && selectedRowIds.size === vendors.length;
  const someSelected = selectedRowIds.size > 0 && !allSelected;
  const toggleSelectAll = (checked: boolean) => setSelectedRowIds(checked ? new Set(allRowIds) : new Set());
  const selectedIds = Array.from(selectedRowIds);

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
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

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(c) => toggleSelectAll(c === true)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Include</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead className="text-right">Confidence</TableHead>
              <TableHead className="min-w-[200px]">Confidence rationale</TableHead>
              <TableHead className="min-w-[180px]">Evidence</TableHead>
              <TableHead>SEC status</TableHead>
              <TableHead className="text-right">Total co. rev</TableHead>
              <TableHead>FY</TableHead>
              <TableHead>Revenue tag</TableHead>
              <TableHead>SEC filing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((v) => {
              const included = isVendorIncluded(v);
              const total =
                v.totalCompanyRevenue ??
                (v.revenue > 0 ? v.revenue : null);
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
                      <Badge variant={included ? "default" : "outline"} className="text-[9px]">
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
                      confidence={v.confidence}
                      breakdown={v.confidenceBreakdown}
                      needsReview={v.needsReview}
                    />
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <TextExpandable text={v.confidenceRationale ?? v.rationale ?? ""} />
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <EvidenceExpandable evidence={vendorEvidence(v)} maxVisible={2} />
                  </TableCell>
                  <TableCell>
                    <SecStatusBadge status={v.secDataStatus} retrievedAt={v.secRetrievedAt} />
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                    {total != null ? fmtUsdM(total) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{v.fiscalYear ?? v.secRevenue?.fiscalYear ?? "—"}</TableCell>
                  <TableCell className="text-[10px] font-mono max-w-[120px] truncate" title={v.revenueMetric}>
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
