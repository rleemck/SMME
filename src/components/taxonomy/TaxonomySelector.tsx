import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MarketDefinitionModal } from "./MarketDefinitionModal";
import { DefinitionPreview } from "./DefinitionPreview";
import { SelectedSegmentChips } from "./SelectedSegmentChips";
import { useModel } from "@/store/ModelStore";
import { segmentToSelection } from "@/lib/taxonomy/segments";
import { Layers, ChevronDown } from "lucide-react";

export function TaxonomySelector() {
  const [open, setOpen] = useState(false);
  const { selectedSegments, setSelectedSegments } = useModel();

  const primary = selectedSegments.find((s) => s.isPrimary) ?? selectedSegments[0];

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Market segment (taxonomy)</label>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between h-auto min-h-10 py-2"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2 text-left">
          <Layers className="h-4 w-4 shrink-0 text-mds-blue" />
          {primary ? (
            <span className="break-words">
              {primary.path.join(" › ")}
              {selectedSegments.length > 1 ? ` (+${selectedSegments.length - 1} more)` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">Select segment(s) from taxonomy…</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {selectedSegments.length > 0 && (
        <>
          <SelectedSegmentChips
            segments={selectedSegments}
            onRemove={(id) => setSelectedSegments(selectedSegments.filter((s) => s.id !== id))}
            onSetPrimary={(id) =>
              setSelectedSegments(selectedSegments.map((s) => ({ ...s, isPrimary: s.id === id })))
            }
          />
          <div className="rounded-md border bg-surface-muted p-4 space-y-4">
            {selectedSegments.map((seg) => (
              <div key={seg.id}>
                <div className="text-xs font-medium text-mds-navy mb-2">
                  {seg.isPrimary ? "Primary" : "Adjacent"} · {seg.name}
                </div>
                <DefinitionPreview segment={segmentToSelection(seg)} compact />
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setSelectedSegments([])}>
              Clear all selections
            </Button>
          </div>
        </>
      )}

      <MarketDefinitionModal
        open={open}
        onOpenChange={setOpen}
        segments={selectedSegments}
        onConfirm={setSelectedSegments}
      />
    </div>
  );
}
