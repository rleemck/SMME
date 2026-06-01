export type TaxonomyLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export type TaxonomyNode = {
  id: string;
  level: TaxonomyLevel;
  name: string;
  path: string[];
  definition?: string;
  expandedDefinition?: string;
  children: TaxonomyNode[];
  isHorizontal?: boolean;
  additiveToSoftwareMarket?: boolean;
};

export type TaxonomyFlatNode = {
  id: string;
  level: TaxonomyLevel;
  name: string;
  path: string[];
  definition?: string;
  expandedDefinition?: string;
  isHorizontal?: boolean;
  additiveToSoftwareMarket?: boolean;
  parentId: string | null;
};

export type TaxonomySelection = {
  nodeId: string;
  name: string;
  path: string[];
  level: TaxonomyLevel;
  definition?: string;
  expandedDefinition?: string;
  isHorizontal?: boolean;
  additiveToSoftwareMarket?: boolean;
};

/** L1–L5 segment in the multi-select model (L3–L5 selectable in popup). */
export type SelectedTaxonomySegment = {
  id: string;
  name: string;
  level: "L1" | "L2" | "L3" | "L4" | "L5";
  path: string[];
  definition?: string;
  expandedDefinition?: string;
  isPrimary: boolean;
};

export type PublicCompany = {
  id: string;
  companyName: string;
  exchange: string;
  ticker: string;
  description?: string;
};

export type SourceSnippet = {
  text: string;
  section?: string;
  filingUrl: string;
  pageOrLocation?: string;
};

export type RevenueLineItem = {
  label: string;
  value?: number;
  period?: string;
  sourceSnippet?: string;
};

export type SECFilingSource = {
  companyName: string;
  ticker: string;
  cik: string;
  accessionNumber: string;
  formType: "10-K" | "10-Q" | "S-1" | string;
  filingDate: string;
  fiscalYear?: string;
  filingUrl: string;
  businessDescription?: string;
  segmentRevenueText?: string[];
  revenueLineItems?: RevenueLineItem[];
  sourceSnippets: SourceSnippet[];
};

export type EvidenceItem = {
  text: string;
  section?: string;
  filingUrl?: string;
  formType?: string;
  fiscalYear?: string;
  filingDate?: string;
};

export type ConfidenceBreakdown = {
  taxonomyTermMatch: number;
  expandedDefinitionMatch: number;
  productDescriptionMatch: number;
  segmentRevenueEvidence: number;
  filingEvidenceQuality: number;
  negativeSignals: number;
  finalConfidence: number;
  rationale: string;
};

export type VendorMatch = {
  companyName: string;
  ticker: string;
  exchange?: string;
  confidence: number;
  confidenceBreakdown: ConfidenceBreakdown;
  matchedSegment: string;
  taxonomyPath: string[];
  rationale: string;
  supportingEvidence: string[];
  evidenceItems: EvidenceItem[];
  secFiling?: SECFilingSource;
  estimatedSegmentRevenue?: number;
  estimatedSegmentShare?: number;
  needsReview: boolean;
};

export type MappingStatus = "mapped" | "needs_review" | "excluded";
