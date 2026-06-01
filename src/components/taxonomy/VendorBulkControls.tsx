import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModel } from "@/store/ModelStore";

type ConfirmAction = "includeAll" | "excludeAll" | null;

export function VendorBulkControls() {
  const { vendors, vendorUniverseSummary, includeAllVendors, excludeAllVendors } = useModel();

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const { total } = vendorUniverseSummary;

  const handleConfirm = () => {
    if (confirmAction === "includeAll") includeAllVendors();
    if (confirmAction === "excludeAll") excludeAllVendors();
    setConfirmAction(null);
  };

  if (total === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b bg-surface-muted/50 px-4 py-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmAction("includeAll")}>
          Include All Vendors
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmAction("excludeAll")}>
          Exclude All Vendors
        </Button>
      </div>

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
    </>
  );
}
