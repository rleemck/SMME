import type { Vendor } from "@/lib/mockData";

/** segmentRevenueEstimate = totalCompanyRevenue * estimatedSegmentShare */
export function applySegmentRevenueFromShare(v: Vendor, patch: Partial<Vendor>): Vendor {
  const next = { ...v, ...patch };
  const total = next.totalCompanyRevenue ?? next.revenue ?? 0;
  const share = next.segmentShare ?? next.share / 100;
  const segmentRevenue = Math.round(total * share);
  return {
    ...next,
    revenue: patch.revenue !== undefined ? patch.revenue : total,
    totalCompanyRevenue: patch.totalCompanyRevenue !== undefined ? patch.totalCompanyRevenue : total,
    segmentShare: share,
    segmentRevenue,
    share: Math.round(share * 100),
  };
}
