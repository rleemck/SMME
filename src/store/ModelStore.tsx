import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from "react";
import { Assumption, IssueNode, Vendor, initialAssumptions, initialTree, initialVendors } from "@/lib/mockData";
import type { TaxonomySelection } from "@/types/taxonomy";
import { calculateTam } from "@/services/modelCalculation";
import { runVendorMatching } from "@/services/vendorMatchingService";
import type { VendorMatch } from "@/types/taxonomy";

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
  generateScoping: () => Promise<void>;
  useTaxonomy: boolean;
  setUseTaxonomy: (b: boolean) => void;
};

const ModelContext = createContext<Ctx | null>(null);

function vendorFromMatch(m: VendorMatch, i: number): Vendor {
  const rev = m.estimatedSegmentRevenue ?? 500;
  return {
    id: `v-${m.ticker}-${i}`,
    name: m.companyName,
    ticker: m.ticker,
    exchange: m.exchange,
    filingType: "10-K",
    revenue: rev,
    segmentRevenue: rev,
    segment: m.matchedSegment,
    confidence: m.confidence,
    coverage: m.confidence * 0.95,
    status: m.needsReview ? "Pending" : "Included",
    growth: 12 + Math.round(Math.random() * 20),
    share: Math.round((m.estimatedSegmentShare ?? 0.1) * 100),
    segmentShare: m.estimatedSegmentShare,
    rationale: m.rationale,
    supportingEvidence: m.supportingEvidence,
    matchedSegment: m.matchedSegment,
    taxonomyPath: m.taxonomyPath,
    needsReview: m.needsReview,
    mappingStatus: m.needsReview ? "needs_review" : "mapped",
    fiscalYear: 2025,
    filingSource: "SEC EDGAR (mock)",
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
          .filter((v) => v.status === "Included")
          .map((v) => ({
            id: v.id,
            label: `${v.name} ($${v.segmentRevenue ?? v.revenue}M)`,
            value: v.segmentRevenue ?? v.revenue,
          })),
      },
    ],
  };
}

export function ModelProvider({ children }: { children: ReactNode }) {
  const [market, setMarketState] = useState<Market>({
    name: "Software market",
    description: "",
    geography: "United States",
    timeframe: LATEST_FISCAL_YEAR,
    marketType: "horizontal",
    dataSource: "SEC / public company filings",
  });
  const [primarySegment, setPrimarySegment] = useState<TaxonomySelection | null>(null);
  const [adjacentSegments, setAdjacentSegments] = useState<TaxonomySelection[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [assumptions, setAssumptions] = useState<Assumption[]>(initialAssumptions);
  const [tree, setTree] = useState<IssueNode>(initialTree);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [scopingLoading, setScopingLoading] = useState(false);
  const [scopingError, setScopingError] = useState<string | null>(null);
  const [useTaxonomy, setUseTaxonomy] = useState(true);

  const setMarket = (m: Partial<Market>) => setMarketState((s) => ({ ...s, ...m }));

  const setAssumption = (id: string, value: number) =>
    setAssumptions((arr) => arr.map((a) => (a.id === id ? { ...a, value } : a)));

  const resetAssumptions = () =>
    setAssumptions((arr) => arr.map((a) => ({ ...a, value: a.defaultValue })));

  const updateVendor = useCallback((id: string, patch: Partial<Vendor>) => {
    setVendors((arr) => arr.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  const generateScoping = useCallback(async () => {
    if (!primarySegment) {
      setScopingError("Select a taxonomy segment first.");
      return;
    }
    setScopingLoading(true);
    setScopingError(null);
    try {
      const matches = await runVendorMatching(primarySegment, adjacentSegments);
      const next = matches.map(vendorFromMatch);
      setVendors(next);
      setTree(buildIssueTree(primarySegment, next));
      setMarket({
        name: primarySegment.name,
        description: primarySegment.expandedDefinition ?? primarySegment.definition ?? primarySegment.name,
        marketType: primarySegment.isHorizontal === false ? "vertical" : "horizontal",
      });
    } catch (e) {
      setScopingError(e instanceof Error ? e.message : "Vendor matching failed");
    } finally {
      setScopingLoading(false);
    }
  }, [primarySegment, adjacentSegments]);

  const tamBreakdown = useMemo(
    () => calculateTam(vendors, assumptions, market.geography),
    [vendors, assumptions, market.geography],
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
        generateScoping,
        useTaxonomy,
        setUseTaxonomy,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}

export const useModel = () => {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModel must be used within ModelProvider");
  return ctx;
};

export const fmtUsdB = (m: number) => `$${(m / 1000).toFixed(2)}B`;
export const fmtUsdM = (m: number) => `$${m.toLocaleString(undefined, { maximumFractionDigits: 0 })}M`;
