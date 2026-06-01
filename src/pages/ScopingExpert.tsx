import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useModel } from "@/store/ModelStore";
import { SecMockBanner } from "@/components/sec/SecMockBanner";
import { ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DefinitionPreview } from "@/components/taxonomy/DefinitionPreview";
import { VendorRecommendationTable } from "@/components/taxonomy/VendorRecommendationTable";
import { SelectedSegmentChips } from "@/components/taxonomy/SelectedSegmentChips";
import { segmentToSelection } from "@/lib/taxonomy/segments";
import { useMockSec } from "@/services/secClient";
import { PageShell } from "@/components/layout/PageShell";

export default function ScopingExpert() {
  const {
    market,
    selectedSegments,
    setSelectedSegments,
    primarySegment,
    scopingLoading,
    scopingError,
    generateScoping,
    continueToRevenueMapping,
    revenueTransitionLoading,
    revenueTransitionError,
    vendorUniverseSummary,
  } = useModel();
  const navigate = useNavigate();

  const includedCount = vendorUniverseSummary.included;
  const canContinue = includedCount > 0 && selectedSegments.length > 0 && !scopingLoading;

  const handleContinue = async () => {
    const ok = await continueToRevenueMapping();
    if (ok) navigate("/revenue");
  };

  return (
    <PageShell>
      <div className="mb-4">
        <SecMockBanner />
      </div>
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="mds-eyebrow mb-1">Step 1 · Software Scoping Expert</div>
          <h1 className="text-2xl font-semibold text-mds-navy">Vendor universe & taxonomy mapping</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {primarySegment
              ? `${selectedSegments.length} segment(s) · SEC total company revenue · ${market.timeframe}`
              : "No segment selected"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => generateScoping()} disabled={scopingLoading}>
              {scopingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Re-run matching
            </Button>
            <Button
              onClick={handleContinue}
              className="gap-2"
              disabled={!canContinue || revenueTransitionLoading}
            >
              {revenueTransitionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Continue to Revenue Mapping
            </Button>
          </div>
          {!canContinue && vendorUniverseSummary.total > 0 && (
            <p className="text-xs text-muted-foreground">Include at least one vendor to continue.</p>
          )}
          {vendorUniverseSummary.total === 0 && !scopingLoading && (
            <p className="text-xs text-muted-foreground">Generate vendors from Market Definition first.</p>
          )}
        </div>
      </div>

      {(scopingError || revenueTransitionError) && (
        <div className="mb-4 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          {scopingError ?? revenueTransitionError}
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-6 min-w-0">
        <aside className="xl:w-[22rem] shrink-0 space-y-5">
          <Panel title="Selected taxonomy segments">
            <SelectedSegmentChips
              segments={selectedSegments}
              onRemove={(id) => setSelectedSegments(selectedSegments.filter((s) => s.id !== id))}
              onSetPrimary={(id) =>
                setSelectedSegments(selectedSegments.map((s) => ({ ...s, isPrimary: s.id === id })))
              }
            />
            {selectedSegments.map((seg) => (
              <div key={seg.id} className="mt-4">
                <div className="text-xs font-semibold mb-2">
                  {seg.isPrimary ? "Primary" : "Adjacent"}
                </div>
                <DefinitionPreview segment={segmentToSelection(seg)} />
              </div>
            ))}
            {primarySegment && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{primarySegment.level}</Badge>
                <Badge variant="outline">{market.marketType}</Badge>
              </div>
            )}
          </Panel>
          <Panel title="SEC & matching">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vendor matching uses all selected segment definitions (weighted to the primary segment), live SEC
              10-K excerpts via EDGAR{useMockSec() ? " (mock fallback enabled for local dev)" : ""}, and
              structured confidence scoring.
            </p>
          </Panel>
        </aside>
        <div className="flex-1 min-w-0">
          <VendorRecommendationTable />
        </div>
      </div>
    </PageShell>
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
