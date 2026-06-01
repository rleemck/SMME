import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import type { Vendor } from "@/lib/mockData";
import { useModel } from "@/store/ModelStore";
import { isVendorIncluded } from "@/lib/vendorSelection";
import { EvidenceExpandable } from "./EvidenceExpandable";
import { ConfidenceBreakdownView } from "./ConfidenceBreakdownView";
import { VendorBulkControls } from "./VendorBulkControls";
import type { EvidenceItem } from "@/types/taxonomy";

function vendorEvidence(v: Vendor): EvidenceItem[] {
  if (v.evidenceItems?.length) return v.evidenceItems;
  return (v.supportingEvidence ?? []).map((text) => ({ text }));
}

export function VendorRecommendationTable() {
  const {
    vendors,
    setVendorIncluded,
    includeSelectedVendors,
    excludeSelectedVendors,
  } = useModel();

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const allRowIds = useMemo(() => vendors.map((v) => v.id), [vendors]);
  const allSelected = vendors.length > 0 && selectedRowIds.size === vendors.length;
  const someSelected = selectedRowIds.size > 0 && !allSelected;

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedRowIds(checked ? new Set(allRowIds) : new Set());
  };

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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(c) => toggleSelectAll(c === true)}
                aria-label="Select all vendors"
              />
            </TableHead>
            <TableHead>Include</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Ticker</TableHead>
            <TableHead className="text-right">Confidence</TableHead>
            <TableHead>Rationale</TableHead>
            <TableHead className="min-w-[200px]">Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((v) => {
            const included = isVendorIncluded(v);
            return (
              <TableRow
                key={v.id}
                className={`align-top ${selectedRowIds.has(v.id) ? "bg-mds-blue/5" : ""}`}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedRowIds.has(v.id)}
                    onCheckedChange={(c) => toggleRowSelection(v.id, c === true)}
                    aria-label={`Select ${v.name}`}
                  />
                </TableCell>
                <TableCell>
                  <Switch checked={included} onCheckedChange={(c) => setVendorIncluded(v.id, c)} />
                </TableCell>
                <TableCell className="font-medium">
                  {v.name}
                  {v.manuallyOverridden && (
                    <span className="block text-[10px] text-muted-foreground font-normal">Manual override</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs">{v.ticker}</span>
                  {v.exchange && (
                    <span className="text-xs text-muted-foreground ml-1">{v.exchange}</span>
                  )}
                </TableCell>
                <TableCell>
                  <ConfidenceBreakdownView
                    confidence={v.confidence}
                    breakdown={v.confidenceBreakdown}
                    needsReview={v.needsReview}
                  />
                </TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  <p className="whitespace-normal break-words">{v.confidenceRationale ?? v.rationale}</p>
                </TableCell>
                <TableCell className="max-w-sm">
                  <EvidenceExpandable evidence={vendorEvidence(v)} maxVisible={2} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {vendors.length === 0 && (
        <p className="p-6 text-sm text-muted-foreground text-center">
          Run Generate to populate vendor recommendations from taxonomy and SEC filings.
        </p>
      )}
    </div>
  );
}
