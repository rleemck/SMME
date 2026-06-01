export type EvidenceSourceType =
  | "SEC_BUSINESS_DESCRIPTION"
  | "SEC_PRODUCT_DISCLOSURE"
  | "SEC_SEGMENT_DISCLOSURE"
  | "TAXONOMY_MATCH";

export type EvidenceStrength = "Strong" | "Medium" | "Weak";

export type EvidenceCard = {
  sourceType: EvidenceSourceType;
  excerpt: string;
  explanation: string;
  strength: EvidenceStrength;
  strengthScore: number;
  filingDate: string;
  filingType: string;
  filingUrl: string;
};

export type TaxonomyConceptMatch = {
  concept: string;
  matched: boolean;
};

export type ConfidenceRationaleLine = {
  sign: "+" | "-";
  points: number;
  label: string;
};
