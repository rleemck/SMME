import { useState } from "react";
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
import { getTaxonomyRoots } from "@/lib/taxonomy";
import type { TaxonomySelection } from "@/types/taxonomy";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primary: TaxonomySelection | null;
  adjacent: TaxonomySelection[];
  onConfirm: (primary: TaxonomySelection, adjacent: TaxonomySelection[]) => void;
};

export function MarketDefinitionModal({
  open,
  onOpenChange,
  primary,
  adjacent,
  onConfirm,
}: Props) {
  const [draft, setDraft] = useState<TaxonomySelection | null>(primary);
  const [draftAdjacent, setDraftAdjacent] = useState<TaxonomySelection[]>(adjacent);

  const roots = getTaxonomyRoots();

  const addAdjacent = (sel: TaxonomySelection) => {
    if (draft?.nodeId === sel.nodeId) return;
    if (draftAdjacent.some((a) => a.nodeId === sel.nodeId)) return;
    setDraftAdjacent((a) => [...a, sel]);
  };

  const removeAdjacent = (id: string) => setDraftAdjacent((a) => a.filter((x) => x.nodeId !== id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select software market segment</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Browse the taxonomy hierarchy or search. L1–L3 are expanded by default; L4–L5 are expandable.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="space-y-3 min-h-0 flex flex-col">
            <TaxonomySearch
              onPick={(sel) => {
                setDraft(sel);
              }}
            />
            <TaxonomyTree roots={roots} selectedId={draft?.nodeId ?? null} onSelect={setDraft} />
          </div>
          <div className="space-y-4 overflow-y-auto min-h-0">
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Primary segment</div>
              <DefinitionPreview segment={draft} />
              {draft && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => addAdjacent(draft)}
                  disabled={draftAdjacent.some((a) => a.nodeId === draft.nodeId)}
                >
                  Add as adjacent segment
                </Button>
              )}
            </div>
            {draftAdjacent.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Adjacent segments
                </div>
                <ul className="space-y-2">
                  {draftAdjacent.map((a) => (
                    <li
                      key={a.nodeId}
                      className="flex items-center justify-between text-sm border rounded px-2 py-1.5"
                    >
                      <span className="truncate">{a.path.join(" › ")}</span>
                      <button type="button" onClick={() => removeAdjacent(a.nodeId)} aria-label="Remove">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!draft}
            onClick={() => {
              if (draft) onConfirm(draft, draftAdjacent);
              onOpenChange(false);
            }}
          >
            Confirm selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
