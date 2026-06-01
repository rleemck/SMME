import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModel } from "@/store/ModelStore";
import { isVendorIncluded } from "@/lib/vendorSelection";
import { List } from "lucide-react";

type ConfirmAction = "includeAll" | "excludeAll" | null;

export function VendorBulkControls() {
  const {
    vendors,
    vendorUniverseSummary,
    includeAllVendors,
    excludeAllVendors,
    includeRecommendedVendorsOnly,
    resetToAIRecommendations,
    recommendedConfidenceThreshold,
    setRecommendedConfidenceThreshold,
  } = useModel();

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const { total, included, excluded, selectedForRevenueMapping } = vendorUniverseSummary;

  const thresholdPct = Math.round(recommendedConfidenceThreshold * 100);

  const handleConfirm = () => {
    if (confirmAction === "includeAll") includeAllVendors();
    if (confirmAction === "excludeAll") excludeAllVendors();
    setConfirmAction(null);
  };

  if (total === 0) return null;

  return (
    <div className="space-y-3 border-b bg-surface-muted/50 px-4 py-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-mds-navy">Vendor Universe Summary</h3>
          <dl className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Total Vendors</dt>
              <dd className="font-semibold tabular-nums">{total}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Included</dt>
              <dd className="font-semibold tabular-nums text-mds-success">{included}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Excluded</dt>
              <dd className="font-semibold tabular-nums">{excluded}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Selected for Revenue Mapping</dt>
              <dd className="font-semibold tabular-nums text-mds-blue">{selectedForRevenueMapping}</dd>
            </div>
          </dl>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => setSummaryOpen(true)}
        >
          <List className="h-4 w-4" />
          View full summary
        </Button>
      </div>

      {/* Horizontal scroll at bottom when bulk actions overflow */}
      <div className="scroll-region-x -mx-4 px-4 pb-0.5">
        <div className="flex flex-nowrap items-end gap-2 min-w-max py-0.5">
          <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmAction("includeAll")}>
            Include All Vendors
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmAction("excludeAll")}>
            Exclude All Vendors
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => includeRecommendedVendorsOnly()}>
            Include Recommended Only
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => resetToAIRecommendations()}>
            Reset to AI Recommendations
          </Button>
          <div className="flex items-center gap-2 pl-4 border-l border-border/80">
            <Label htmlFor="conf-threshold" className="text-xs text-muted-foreground whitespace-nowrap">
              Recommended threshold
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id="conf-threshold"
                type="number"
                min={50}
                max={99}
                className="h-8 w-14 text-right"
                value={thresholdPct}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n)) {
                    setRecommendedConfidenceThreshold(Math.min(0.99, Math.max(0.5, n / 100)));
                  }
                }}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] !flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b bg-card">
            <DialogTitle>Vendor universe summary</DialogTitle>
            <DialogDescription>
              {included} included · {excluded} excluded · {selectedForRevenueMapping} selected for revenue mapping
              (threshold ≥ {thresholdPct}%)
            </DialogDescription>
            <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <SummaryStat label="Total" value={total} />
              <SummaryStat label="Included" value={included} accent="success" />
              <SummaryStat label="Excluded" value={excluded} />
              <SummaryStat label="For revenue mapping" value={selectedForRevenueMapping} accent="blue" />
            </dl>
          </DialogHeader>

          <div className="scroll-region-y flex-1 min-h-0 px-6 py-4">
            <div className="scroll-region-x min-w-0 rounded-md border">
              <Table className="desktop-data-table text-sm min-w-[40rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[10rem]">Company</TableHead>
                    <TableHead className="cell-compact">Ticker</TableHead>
                    <TableHead className="cell-compact">Status</TableHead>
                    <TableHead className="text-right cell-compact">Confidence</TableHead>
                    <TableHead className="min-w-[8rem]">Segment</TableHead>
                    <TableHead className="min-w-[6rem]">SEC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => {
                    const inc = isVendorIncluded(v);
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell className="font-mono text-xs">{v.ticker}</TableCell>
                        <TableCell>
                          <Badge variant={inc ? "default" : "outline"} className="text-[10px]">
                            {inc ? "Included" : "Excluded"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Math.round(v.confidence * 100)}%
                        </TableCell>
                        <TableCell className="text-xs">{v.matchedSegment ?? "—"}</TableCell>
                        <TableCell className="text-xs capitalize">
                          {v.secDataStatus?.replace(/_/g, " ") ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 shrink-0 border-t bg-card gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setSummaryOpen(false)}>
              Close
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmAction("includeAll")}>
              Include all
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => includeRecommendedVendorsOnly()}>
              Recommended only
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] !flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {confirmAction === "includeAll"
                ? `Include all ${total} vendors?`
                : `Exclude all ${total} vendors?`}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "includeAll"
                ? "This will add all vendors to the market model and revenue mapping workflow."
                : "This will remove all vendors from market sizing calculations."}
            </DialogDescription>
          </DialogHeader>
          <div className="scroll-region-y min-h-0 flex-1 -mx-1 px-1">
            <p className="text-xs text-muted-foreground mb-2">Affected vendors ({total}):</p>
            <ul className="text-sm space-y-1">
              {vendors.map((v) => (
                <li key={v.id} className="flex justify-between gap-4 border-b border-dashed py-1.5 last:border-0">
                  <span className="font-medium break-words">{v.name}</span>
                  <span className="font-mono text-xs text-muted-foreground shrink-0">{v.ticker}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter className="shrink-0 pt-2 border-t">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction === "excludeAll" ? "destructive" : "default"}
              onClick={handleConfirm}
            >
              {confirmAction === "includeAll" ? "Include All" : "Exclude All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "success" | "blue";
}) {
  const valueClass =
    accent === "success"
      ? "text-mds-success"
      : accent === "blue"
        ? "text-mds-blue"
        : "text-mds-navy";
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={`font-semibold tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}
