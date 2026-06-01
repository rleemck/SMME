/** Per-vendor inclusion state for bulk actions and revenue mapping. */
export type VendorSelectionState = {
  vendorId: string;
  included: boolean;
  excludedReason?: string;
  manuallyOverridden: boolean;
  originalAIRecommendation: boolean;
};

export const DEFAULT_RECOMMENDED_CONFIDENCE_THRESHOLD = 0.7;
