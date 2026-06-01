import type { Vendor } from "@/lib/mockData";
import type { VendorSelectionState } from "@/types/vendorSelection";

export function isVendorIncluded(v: Vendor): boolean {
  return v.status === "Included" && v.mappingStatus !== "excluded";
}

export function vendorToSelectionState(v: Vendor): VendorSelectionState {
  return {
    vendorId: v.id,
    included: isVendorIncluded(v),
    excludedReason: v.excludedReason,
    manuallyOverridden: v.manuallyOverridden ?? false,
    originalAIRecommendation: v.originalAIRecommendation ?? isVendorIncluded(v),
  };
}

export function applyVendorInclusion(
  v: Vendor,
  included: boolean,
  opts?: { manuallyOverridden?: boolean; excludedReason?: string; clearOverride?: boolean },
): Vendor {
  const manuallyOverridden = opts?.clearOverride ? false : (opts?.manuallyOverridden ?? true);
  if (included) {
    return {
      ...v,
      status: "Included",
      mappingStatus: v.needsReview ? "needs_review" : "mapped",
      manuallyOverridden,
      excludedReason: undefined,
    };
  }
  return {
    ...v,
    status: "Excluded",
    mappingStatus: "excluded",
    manuallyOverridden,
    excludedReason: opts?.excludedReason,
  };
}

export function restoreAIRecommendation(v: Vendor): Vendor {
  const included = v.originalAIRecommendation ?? false;
  const status = v.originalAIStatus ?? (included ? "Included" : v.needsReview ? "Pending" : "Excluded");
  return {
    ...v,
    status,
    mappingStatus:
      status === "Excluded"
        ? "excluded"
        : v.needsReview
          ? "needs_review"
          : "mapped",
    manuallyOverridden: false,
    excludedReason: undefined,
  };
}

export type VendorUniverseSummary = {
  total: number;
  included: number;
  excluded: number;
  selectedForRevenueMapping: number;
};

export function summarizeVendorUniverse(vendors: Vendor[]): VendorUniverseSummary {
  const included = vendors.filter(isVendorIncluded);
  return {
    total: vendors.length,
    included: included.length,
    excluded: vendors.length - included.length,
    selectedForRevenueMapping: included.length,
  };
}
