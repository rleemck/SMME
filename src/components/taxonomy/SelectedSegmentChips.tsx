import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SelectedTaxonomySegment } from "@/types/taxonomy";
import { Star, X } from "lucide-react";

type Props = {
  segments: SelectedTaxonomySegment[];
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
};

export function SelectedSegmentChips({ segments, onRemove, onSetPrimary }: Props) {
  if (!segments.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {segments.map((seg) => (
        <div
          key={seg.id}
          className="inline-flex items-center gap-1 rounded-full border bg-surface-muted pl-2 pr-1 py-1 text-xs max-w-full"
        >
          {seg.isPrimary ? (
            <Star className="h-3 w-3 text-mds-blue shrink-0 fill-mds-blue" />
          ) : (
            <button
              type="button"
              className="text-[10px] text-mds-blue hover:underline shrink-0"
              onClick={() => onSetPrimary(seg.id)}
              title="Set as primary"
            >
              Set primary
            </button>
          )}
          <span className="break-words" title={seg.path.join(" › ")}>
            <Badge variant="outline" className="text-[10px] mr-1 py-0 shrink-0">
              {seg.level}
            </Badge>
            {seg.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onRemove(seg.id)}
            aria-label={`Remove ${seg.name}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
