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

export type PublicCompany = {
  id: string;
  companyName: string;
  exchange: string;
  ticker: string;
  description?: string;
};

export type VendorMatch = {
  companyName: string;
  ticker: string;
  exchange?: string;
  confidence: number;
  matchedSegment: string;
  taxonomyPath: string[];
  rationale: string;
  supportingEvidence: string[];
  estimatedSegmentRevenue?: number;
  estimatedSegmentShare?: number;
  needsReview: boolean;
};

export type MappingStatus = "mapped" | "needs_review" | "excluded";
