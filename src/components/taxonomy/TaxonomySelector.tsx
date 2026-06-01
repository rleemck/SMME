import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MarketDefinitionModal } from "./MarketDefinitionModal";
import { DefinitionPreview } from "./DefinitionPreview";
import { useModel } from "@/store/ModelStore";
import { Layers, ChevronDown } from "lucide-react";

export function TaxonomySelector() {
  const [open, setOpen] = useState(false);
  const { primarySegment, adjacentSegments, setPrimarySegment, setAdjacentSegments } = useModel();

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
          {primarySegment ? (
            <span className="truncate">{primarySegment.path.join(" › ")}</span>
          ) : (
            <span className="text-muted-foreground">Select segment from taxonomy…</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {primarySegment && (
        <div className="rounded-md border bg-surface-muted p-4">
          <DefinitionPreview segment={primarySegment} compact />
          {primarySegment && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setPrimarySegment(null);
                setAdjacentSegments([]);
              }}
            >
              Clear selection
            </Button>
          )}
        </div>
      )}

      <MarketDefinitionModal
        open={open}
        onOpenChange={setOpen}
        primary={primarySegment}
        adjacent={adjacentSegments}
        onConfirm={(p, a) => {
          setPrimarySegment(p);
          setAdjacentSegments(a);
        }}
      />
    </div>
  );
}
