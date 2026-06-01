import type { TaxonomySelection } from "@/types/taxonomy";
import { Badge } from "@/components/ui/badge";

type Props = {
  segment: TaxonomySelection | null;
  compact?: boolean;
};

export function DefinitionPreview({ segment, compact }: Props) {
  if (!segment) {
    return <p className="text-sm text-muted-foreground">Select a segment to preview definitions.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{segment.level}</Badge>
        <span className="text-sm font-medium text-mds-navy">{segment.path.join(" › ")}</span>
        {segment.additiveToSoftwareMarket && (
          <Badge className="bg-mds-blue hover:bg-mds-blue">Additive to software TAM</Badge>
        )}
        {segment.isHorizontal === false && (
          <Badge variant="outline">Vertical (non-additive)</Badge>
        )}
      </div>
      {segment.definition && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Definition
          </div>
          <p className={`text-sm text-foreground ${compact ? "line-clamp-3" : ""}`}>{segment.definition}</p>
        </div>
      )}
      {segment.expandedDefinition && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Expanded definition
          </div>
          <p
            className={`text-sm text-muted-foreground leading-relaxed break-words whitespace-pre-wrap ${
              compact ? "line-clamp-6" : ""
            }`}
          >
            {segment.expandedDefinition}
          </p>
        </div>
      )}
    </div>
  );
}
