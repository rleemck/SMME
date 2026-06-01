import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModel } from "@/store/ModelStore";
import { DEFAULT_RECOMMENDED_CONFIDENCE_THRESHOLD } from "@/types/vendorSelection";

type ConfirmAction = "includeAll" | "excludeAll" | null;

export function VendorBulkControls() {
  const {
    vendorUniverseSummary,
    includeAllVendors,
    excludeAllVendors,
    includeRecommendedVendorsOnly,
    resetToAIRecommendations,
    recommendedConfidenceThreshold,
    setRecommendedConfidenceThreshold,
  } = useModel();

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const { total, included, excluded, selectedForRevenueMapping } = vendorUniverseSummary;

  const thresholdPct = Math.round(recommendedConfidenceThreshold * 100);

  const handleConfirm = () => {
    if (confirmAction === "includeAll") includeAllVendors();
    if (confirmAction === "excludeAll") excludeAllVendors();
    setConfirmAction(null);
  };

  if (total === 0) return null;

  return (
    <div className="space-y-4 border-b bg-surface-muted/50 px-4 py-4">
      <div>
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

      <div className="flex flex-wrap items-end gap-2">
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
        <div className="flex items-center gap-2 ml-auto">
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
                  setRecommendedConfidenceThreshold(
                    Math.min(0.99, Math.max(0.5, n / 100)),
                  );
                }
              }}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
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
          <DialogFooter>
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
