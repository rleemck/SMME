import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useModel } from "@/store/ModelStore";
import { ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DefinitionPreview } from "@/components/taxonomy/DefinitionPreview";
import { VendorRecommendationTable } from "@/components/taxonomy/VendorRecommendationTable";

export default function ScopingExpert() {
  const { market, primarySegment, adjacentSegments, scopingLoading, scopingError, generateScoping } =
    useModel();
  const navigate = useNavigate();

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="mds-eyebrow mb-1">Step 1 · Software Scoping Expert</div>
          <h1 className="text-2xl font-semibold text-mds-navy">Vendor universe & taxonomy mapping</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {primarySegment
              ? `Segment: ${primarySegment.path.join(" › ")} · ${market.geography} · ${market.timeframe}`
              : "No segment selected"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => generateScoping()} disabled={scopingLoading}>
            {scopingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Re-run matching
          </Button>
          <Button onClick={() => navigate("/revenue")} className="gap-2">
            Continue to Revenue Mapping <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {scopingError && (
        <div className="mb-4 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          {scopingError}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <Panel title="Selected taxonomy segment">
            <DefinitionPreview segment={primarySegment} />
            {primarySegment && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{primarySegment.level}</Badge>
                <Badge variant="outline">{market.marketType}</Badge>
                {primarySegment.additiveToSoftwareMarket && (
                  <Badge className="bg-mds-success hover:bg-mds-success">Horizontal · additive</Badge>
                )}
              </div>
            )}
          </Panel>
          {adjacentSegments.length > 0 && (
            <Panel title="Adjacent segments">
              <ul className="text-sm space-y-1 text-muted-foreground">
                {adjacentSegments.map((a) => (
                  <li key={a.nodeId}>{a.path.join(" › ")}</li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel title="AI & SEC orchestration">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vendor matching uses expanded definitions, Companies universe, mock SEC 10-K excerpts, and AI
              Gateway structured JSON. Replace mock services with live SEC EDGAR and Platform McKinsey AI
              Gateway when credentials are available.
            </p>
          </Panel>
        </div>
        <div className="col-span-12 lg:col-span-8">
          <VendorRecommendationTable />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card shadow-sm p-5">
      <h3 className="text-sm font-semibold text-mds-navy mb-3">{title}</h3>
      {children}
    </div>
  );
}
