import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from "react";
import { Assumption, IssueNode, Vendor, initialAssumptions, initialTree, initialVendors } from "@/lib/mockData";
import type { SelectedTaxonomySegment, TaxonomySelection } from "@/types/taxonomy";
import {
  adjacentFromSegments,
  primaryFromSegments,
  segmentsFromLegacy,
  selectionToSegment,
} from "@/lib/taxonomy/segments";
import { calculateTam } from "@/services/modelCalculation";
import { runVendorMatchingFromSegments } from "@/services/vendorMatchingService";
import type { VendorMatch } from "@/types/taxonomy";
import { useMockSec } from "@/services/secClient";
import {
  applyVendorInclusion,
  isVendorIncluded,
  restoreAIRecommendation,
  summarizeVendorUniverse,
} from "@/lib/vendorSelection";
import { DEFAULT_RECOMMENDED_CONFIDENCE_THRESHOLD } from "@/types/vendorSelection";

export const US_GEOGRAPHY = "United States";
export const US_GEOGRAPHY_HELPER =
  "Geography is fixed to the United States for this MVP because vendor revenue mapping uses SEC filings.";

const LATEST_FISCAL_YEAR = "2025 (latest available)";

type Market = {
  name: string;
  description: string;
  geography: string;
  timeframe: string;
  marketType: "horizontal" | "vertical";
  dataSource: string;
};

type Ctx = {
  market: Market;
  setMarket: (m: Partial<Market>) => void;
  selectedSegments: SelectedTaxonomySegment[];
  setSelectedSegments: (segments: SelectedTaxonomySegment[]) => void;
  primarySegment: TaxonomySelection | null;
  adjacentSegments: TaxonomySelection[];
  setPrimarySegment: (s: TaxonomySelection | null) => void;
  setAdjacentSegments: (s: TaxonomySelection[]) => void;
  vendors: Vendor[];
  setVendors: (v: Vendor[]) => void;
  updateVendor: (id: string, patch: Partial<Vendor>) => void;
  assumptions: Assumption[];
  setAssumption: (id: string, value: number) => void;
  resetAssumptions: () => void;
  tree: IssueNode;
  setTree: (t: IssueNode) => void;
  tam: number;
  baseRevenue: number;
  tamBreakdown: ReturnType<typeof calculateTam>;
  copilotOpen: boolean;
  setCopilotOpen: (b: boolean) => void;
  scopingLoading: boolean;
  scopingError: string | null;
  revenueTransitionLoading: boolean;
  revenueTransitionError: string | null;
  generateScoping: () => Promise<void>;
  continueToRevenueMapping: () => Promise<boolean>;
  useTaxonomy: boolean;
  setUseTaxonomy: (b: boolean) => void;
  recommendedConfidenceThreshold: number;
  setRecommendedConfidenceThreshold: (n: number) => void;
  vendorUniverseSummary: ReturnType<typeof summarizeVendorUniverse>;
  includedVendors: Vendor[];
  includeAllVendors: () => void;
  excludeAllVendors: () => void;
  includeRecommendedVendorsOnly: () => void;
  resetToAIRecommendations: () => void;
  includeSelectedVendors: (ids: string[]) => void;
  excludeSelectedVendors: (ids: string[]) => void;
  setVendorIncluded: (id: string, included: boolean) => void;
};

const ModelContext = createContext<Ctx | null>(null);

function vendorFromMatch(m: VendorMatch, i: number): Vendor {
  const rev =
    m.estimatedSegmentRevenue ??
    m.secFiling?.revenueLineItems?.[0]?.value ??
    500;
  const totalRev = m.secFiling?.revenueLineItems?.[0]?.value ?? rev * 2;
  const fy = m.secFiling?.fiscalYear ? parseInt(m.secFiling.fiscalYear, 10) : 2025;
  const originalAIRecommendation = !m.needsReview;
  const originalAIStatus: Vendor["originalAIStatus"] = m.needsReview ? "Pending" : "Included";

  return {
    id: `v-${m.ticker}-${i}`,
    name: m.companyName,
    ticker: m.ticker,
    exchange: m.exchange,
    filingType: m.secFiling?.formType ?? "10-K",
    revenue: totalRev,
    segmentRevenue: rev,
    segment: m.matchedSegment,
    confidence: m.confidence,
    coverage: m.confidence * 0.95,
    status: originalAIStatus,
    originalAIRecommendation,
    originalAIStatus,
    manuallyOverridden: false,
    growth: 12 + Math.round(Math.random() * 20),
    share: Math.round((m.estimatedSegmentShare ?? 0.1) * 100),
    segmentShare: m.estimatedSegmentShare,
    rationale: m.rationale,
    confidenceRationale: m.confidenceBreakdown.rationale,
    confidenceBreakdown: m.confidenceBreakdown,
    supportingEvidence: m.supportingEvidence,
    evidenceItems: m.evidenceItems,
    secFiling: m.secFiling,
    cik: m.secFiling?.cik,
    accessionNumber: m.secFiling?.accessionNumber,
    filingUrl: m.secFiling?.filingUrl,
    matchedSegment: m.matchedSegment,
    taxonomyPath: m.taxonomyPath,
    needsReview: m.needsReview,
    mappingStatus: m.needsReview ? "needs_review" : "mapped",
    fiscalYear: Number.isNaN(fy) ? 2025 : fy,
    filingSource: useMockSec() ? "SEC EDGAR (mock fallback)" : "SEC EDGAR",
  };
}

function buildIssueTree(segment: TaxonomySelection, vendors: Vendor[]): IssueNode {
  return {
    id: "root",
    label: `TAM — ${segment.path.join(" › ")}`,
    children: [
      {
        id: "seg",
        label: segment.name,
        children: vendors
          .filter(isVendorIncluded)
          .map((v) => ({
            id: v.id,
            label: `${v.name} ($${v.segmentRevenue ?? v.revenue}M)`,
            value: v.segmentRevenue ?? v.revenue,
          })),
      },
    ],
  };
}

function syncLegacySegments(segments: SelectedTaxonomySegment[]) {
  return {
    primary: primaryFromSegments(segments),
    adjacent: adjacentFromSegments(segments),
  };
}

export function ModelProvider({ children }: { children: ReactNode }) {
  const [market, setMarketState] = useState<Market>({
    name: "Software market",
    description: "",
    geography: US_GEOGRAPHY,
    timeframe: LATEST_FISCAL_YEAR,
    marketType: "horizontal",
    dataSource: "SEC / public company filings",
  });
  const [selectedSegments, setSelectedSegmentsState] = useState<SelectedTaxonomySegment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [assumptions, setAssumptions] = useState<Assumption[]>(initialAssumptions);
  const [tree, setTree] = useState<IssueNode>(initialTree);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [scopingLoading, setScopingLoading] = useState(false);
  const [scopingError, setScopingError] = useState<string | null>(null);
  const [revenueTransitionLoading, setRevenueTransitionLoading] = useState(false);
  const [revenueTransitionError, setRevenueTransitionError] = useState<string | null>(null);
  const [useTaxonomy, setUseTaxonomy] = useState(true);
  const [recommendedConfidenceThreshold, setRecommendedConfidenceThreshold] = useState(
    DEFAULT_RECOMMENDED_CONFIDENCE_THRESHOLD,
  );

  const { primary: primarySegment, adjacent: adjacentSegments } = useMemo(
    () => syncLegacySegments(selectedSegments),
    [selectedSegments],
  );

  const setMarket = (m: Partial<Market>) =>
    setMarketState((s) => ({
      ...s,
      ...m,
      geography: US_GEOGRAPHY,
    }));

  const setSelectedSegments = useCallback((segments: SelectedTaxonomySegment[]) => {
    const normalized =
      segments.length > 0 && !segments.some((s) => s.isPrimary)
        ? segments.map((s, i) => ({ ...s, isPrimary: i === 0 }))
        : segments;
    setSelectedSegmentsState(normalized);
  }, []);

  const setPrimarySegment = (s: TaxonomySelection | null) => {
    if (!s) {
      setSelectedSegmentsState([]);
      return;
    }
    const adjacent = selectedSegments.filter((seg) => !seg.isPrimary);
    setSelectedSegments([selectionToSegment(s, true), ...adjacent]);
  };

  const setAdjacentSegments = (adj: TaxonomySelection[]) => {
    const primary = primarySegment;
    if (!primary) return;
    setSelectedSegments([
      selectionToSegment(primary, true),
      ...adj.map((a) => selectionToSegment(a, false)),
    ]);
  };

  const setAssumption = (id: string, value: number) =>
    setAssumptions((arr) => arr.map((a) => (a.id === id ? { ...a, value } : a)));

  const resetAssumptions = () =>
    setAssumptions((arr) => arr.map((a) => ({ ...a, value: a.defaultValue })));

  const syncTree = useCallback(
    (nextVendors: Vendor[]) => {
      const primary = primaryFromSegments(selectedSegments);
      if (primary) setTree(buildIssueTree(primary, nextVendors));
    },
    [selectedSegments],
  );

  const applyToAllVendors = useCallback(
    (fn: (v: Vendor) => Vendor) => {
      setVendors((arr) => {
        const next = arr.map(fn);
        syncTree(next);
        return next;
      });
    },
    [syncTree],
  );

  const setVendorIncluded = useCallback(
    (id: string, included: boolean) => {
      setVendors((arr) => {
        const next = arr.map((v) =>
          v.id === id
            ? applyVendorInclusion(v, included, {
                manuallyOverridden: true,
                excludedReason: included ? undefined : "Manually excluded",
              })
            : v,
        );
        syncTree(next);
        return next;
      });
    },
    [syncTree],
  );

  const updateVendor = useCallback(
    (id: string, patch: Partial<Vendor>) => {
      setVendors((arr) => {
        const next = arr.map((v) => (v.id === id ? { ...v, ...patch } : v));
        if ("status" in patch || "mappingStatus" in patch) {
          syncTree(next);
        }
        return next;
      });
    },
    [syncTree],
  );

  const includeAllVendors = useCallback(() => {
    applyToAllVendors((v) => applyVendorInclusion(v, true, { excludedReason: undefined }));
  }, [applyToAllVendors]);

  const excludeAllVendors = useCallback(() => {
    applyToAllVendors((v) =>
      applyVendorInclusion(v, false, { excludedReason: "Bulk excluded" }),
    );
  }, [applyToAllVendors]);

  const includeRecommendedVendorsOnly = useCallback(() => {
    applyToAllVendors((v) => {
      const included = v.confidence >= recommendedConfidenceThreshold;
      return applyVendorInclusion(v, included, {
        excludedReason: included ? undefined : "Below confidence threshold",
      });
    });
  }, [applyToAllVendors, recommendedConfidenceThreshold]);

  const resetToAIRecommendations = useCallback(() => {
    applyToAllVendors((v) => restoreAIRecommendation(v));
  }, [applyToAllVendors]);

  const includeSelectedVendors = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      applyToAllVendors((v) =>
        idSet.has(v.id) ? applyVendorInclusion(v, true) : v,
      );
    },
    [applyToAllVendors],
  );

  const excludeSelectedVendors = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      applyToAllVendors((v) =>
        idSet.has(v.id)
          ? applyVendorInclusion(v, false, { excludedReason: "Bulk excluded (selection)" })
          : v,
      );
    },
    [applyToAllVendors],
  );

  const vendorUniverseSummary = useMemo(() => summarizeVendorUniverse(vendors), [vendors]);
  const includedVendors = useMemo(() => vendors.filter(isVendorIncluded), [vendors]);

  const generateScoping = useCallback(async () => {
    if (selectedSegments.length === 0) {
      setScopingError("Select at least one taxonomy segment first.");
      return;
    }
    setScopingLoading(true);
    setScopingError(null);
    try {
      const matches = await runVendorMatchingFromSegments(selectedSegments);
      const next = matches.map(vendorFromMatch);
      setVendors(next);
      const primary = primaryFromSegments(selectedSegments);
      if (primary) {
        setTree(buildIssueTree(primary, next));
        setMarket({
          name: primary.name,
          description: primary.expandedDefinition ?? primary.definition ?? primary.name,
          marketType: primary.isHorizontal === false ? "vertical" : "horizontal",
          dataSource: "SEC / public company filings (US)",
        });
      }
    } catch (e) {
      setScopingError(e instanceof Error ? e.message : "Vendor matching failed");
    } finally {
      setScopingLoading(false);
    }
  }, [selectedSegments]);

  const continueToRevenueMapping = useCallback(async (): Promise<boolean> => {
    setRevenueTransitionError(null);
    if (selectedSegments.length === 0) {
      setRevenueTransitionError("Select a taxonomy segment before continuing.");
      return false;
    }
    if (includedVendors.length === 0) {
      setRevenueTransitionError("Include at least one vendor to continue to revenue mapping.");
      return false;
    }
    setRevenueTransitionLoading(true);
    try {
      const primary = primaryFromSegments(selectedSegments);
      if (primary) setTree(buildIssueTree(primary, vendors));
      return true;
    } catch (e) {
      setRevenueTransitionError(e instanceof Error ? e.message : "Could not prepare revenue mapping.");
      return false;
    } finally {
      setRevenueTransitionLoading(false);
    }
  }, [selectedSegments, vendors, includedVendors]);

  const tamBreakdown = useMemo(
    () => calculateTam(vendors, assumptions, US_GEOGRAPHY),
    [vendors, assumptions],
  );

  const { tam, baseRevenue } = useMemo(
    () => ({ tam: tamBreakdown.tam, baseRevenue: tamBreakdown.vendorRevenueSum }),
    [tamBreakdown],
  );

  return (
    <ModelContext.Provider
      value={{
        market,
        setMarket,
        selectedSegments,
        setSelectedSegments,
        primarySegment,
        adjacentSegments,
        setPrimarySegment,
        setAdjacentSegments,
        vendors,
        setVendors,
        updateVendor,
        assumptions,
        setAssumption,
        resetAssumptions,
        tree,
        setTree,
        tam,
        baseRevenue,
        tamBreakdown,
        copilotOpen,
        setCopilotOpen,
        scopingLoading,
        scopingError,
        revenueTransitionLoading,
        revenueTransitionError,
        generateScoping,
        continueToRevenueMapping,
        useTaxonomy,
        setUseTaxonomy,
        recommendedConfidenceThreshold,
        setRecommendedConfidenceThreshold,
        vendorUniverseSummary,
        includedVendors,
        includeAllVendors,
        excludeAllVendors,
        includeRecommendedVendorsOnly,
        resetToAIRecommendations,
        includeSelectedVendors,
        excludeSelectedVendors,
        setVendorIncluded,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
};

export const useModel = () => {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModel must be used within ModelProvider");
  return ctx;
};

export const fmtUsdB = (m: number) => `$${(m / 1000).toFixed(2)}B`;
export const fmtUsdM = (m: number) => `$${m.toLocaleString(undefined, { maximumFractionDigits: 0 })}M`;

/** @deprecated use selectedSegments */
export { segmentsFromLegacy };
