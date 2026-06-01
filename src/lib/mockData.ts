import type { ConfidenceBreakdown, EvidenceItem, MappingStatus, SECFilingSource } from "@/types/taxonomy";

export type Vendor = {
  id: string;
  name: string;
  ticker: string;
  exchange?: string;
  filingType: string;
  revenue: number; // $M total or segment
  segment: string;
  confidence: number;
  coverage: number;
  status: "Included" | "Pending" | "Excluded";
  growth: number;
  share: number;
  rationale?: string;
  confidenceRationale?: string;
  confidenceBreakdown?: ConfidenceBreakdown;
  supportingEvidence?: string[];
  evidenceItems?: EvidenceItem[];
  secFiling?: SECFilingSource;
  cik?: string;
  accessionNumber?: string;
  filingUrl?: string;
  matchedSegment?: string;
  taxonomyPath?: string[];
  needsReview?: boolean;
  segmentRevenue?: number;
  segmentShare?: number;
  mappingStatus?: MappingStatus;
  notes?: string;
  fiscalYear?: number;
  filingSource?: string;
  /** AI recommended inclusion at match time */
  originalAIRecommendation?: boolean;
  /** Original status from AI matching (for reset) */
  originalAIStatus?: "Included" | "Pending" | "Excluded";
  /** User changed inclusion via bulk or manual toggle */
  manuallyOverridden?: boolean;
  excludedReason?: string;
};

export type Assumption = {
  id: string;
  name: string;
  defaultValue: number;
  value: number;
  unit: "%" | "x" | "";
  source: string;
  description: string;
  editable: boolean;
};

export type IssueNode = {
  id: string;
  label: string;
  value?: number;
  children?: IssueNode[];
};

export const initialVendors: Vendor[] = [];

export const initialAssumptions: Assumption[] = [
  {
    id: "a1",
    name: "Market Growth Rate",
    defaultValue: 14,
    value: 14,
    unit: "%",
    source: "Gartner 2024",
    description: "Average annual market growth rate.",
    editable: true,
  },
  {
    id: "a2",
    name: "Private Company Factor",
    defaultValue: 1.08,
    value: 1.08,
    unit: "x",
    source: "Internal benchmark",
    description: "Multiplier applied for private company revenue not captured in public filings.",
    editable: true,
  },
  {
    id: "a3",
    name: "Segment Adjustment Factor",
    defaultValue: 1.0,
    value: 1.0,
    unit: "x",
    source: "Taxonomy mapping",
    description: "Adjustment for segment attribution coverage.",
    editable: true,
  },
  {
    id: "a4",
    name: "Revenue Attribution Confidence Threshold",
    defaultValue: 75,
    value: 75,
    unit: "%",
    source: "Model policy",
    description: "Minimum confidence to auto-include vendor revenue.",
    editable: true,
  },
  {
    id: "a5",
    name: "International Share",
    defaultValue: 0,
    value: 0,
    unit: "%",
    source: "US default",
    description: "Share of revenue from outside selected geography (0 for US-only).",
    editable: true,
  },
  {
    id: "a6",
    name: "Source Reliability Weighting",
    defaultValue: 1.0,
    value: 1.0,
    unit: "x",
    source: "SEC filings",
    description: "Weight applied to SEC-sourced vs estimated revenue.",
    editable: true,
  },
];

export const initialTree: IssueNode = {
  id: "root",
  label: "TAM — Select a taxonomy segment",
  children: [],
};

/** @deprecated use taxonomy JSON */
export const taxonomy = {
  primary: "Software",
  subsegments: [] as string[],
  keywords: [] as string[],
};
