import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TaxonomyTree } from "./TaxonomyTree";
import { TaxonomySearch } from "./TaxonomySearch";
import { DefinitionPreview } from "./DefinitionPreview";
import { SelectedSegmentChips } from "./SelectedSegmentChips";
import { getTaxonomyRoots } from "@/lib/taxonomy";
import { isSelectableSegmentLevel, selectionToSegment } from "@/lib/taxonomy/segments";
import type { SelectedTaxonomySegment, TaxonomySelection } from "@/types/taxonomy";
import { segmentToSelection } from "@/lib/taxonomy/segments";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segments: SelectedTaxonomySegment[];
  onConfirm: (segments: SelectedTaxonomySegment[]) => void;
};

export function MarketDefinitionModal({ open, onOpenChange, segments, onConfirm }: Props) {
  const [draftSegments, setDraftSegments] = useState<SelectedTaxonomySegment[]>(segments);

  useEffect(() => {
    if (open) setDraftSegments(segments);
  }, [open, segments]);

  const roots = getTaxonomyRoots();

  const addSegment = (sel: TaxonomySelection) => {
    if (!isSelectableSegmentLevel(sel.level)) {
      toast.message("Select an L3, L4, or L5 segment to add to the market definition.");
      return;
    }
    if (draftSegments.some((s) => s.id === sel.nodeId)) {
      toast.message("Segment already selected.");
      return;
    }
    const isFirst = draftSegments.length === 0;
    setDraftSegments((prev) => [...prev, selectionToSegment(sel, isFirst)]);
  };

  const removeSegment = (id: string) => {
    setDraftSegments((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length && !next.some((s) => s.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  };

  const setPrimary = (id: string) => {
    setDraftSegments((prev) =>
      prev.map((s) => ({ ...s, isPrimary: s.id === id })),
    );
  };

  const primaryDraft = draftSegments.find((s) => s.isPrimary) ?? draftSegments[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select software market segment(s)</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select one or more L3–L5 segments. Mark one as primary; others are adjacent / included segments.
          </p>
        </DialogHeader>

        <SelectedSegmentChips
          segments={draftSegments}
          onRemove={removeSegment}
          onSetPrimary={setPrimary}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="space-y-3 min-h-0 flex flex-col">
            <TaxonomySearch onPick={addSegment} />
            <TaxonomyTree
              roots={roots}
              selectedIds={draftSegments.map((s) => s.id)}
              onSelect={addSegment}
            />
          </div>
          <div className="space-y-4 overflow-y-auto min-h-0">
            {draftSegments.length === 0 ? (
              <DefinitionPreview segment={null} />
            ) : (
              draftSegments.map((seg) => (
                <div key={seg.id} className="border rounded-md p-3 space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    {seg.isPrimary ? "Primary segment" : "Adjacent / included"}
                  </div>
                  <DefinitionPreview segment={segmentToSelection(seg)} />
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!primaryDraft}
            onClick={() => {
              if (!primaryDraft) return;
              onConfirm(draftSegments);
              onOpenChange(false);
            }}
          >
            Confirm selection ({draftSegments.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
