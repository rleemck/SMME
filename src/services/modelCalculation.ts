import type { Assumption } from "@/lib/mockData";
import type { Vendor } from "@/lib/mockData";

export type TamBreakdown = {
  vendorRevenueSum: number;
  privateCompanyAdjustment: number;
  internationalAdjustment: number;
  otherAdjustments: number;
  tam: number;
};

export function calculateTam(
  vendors: Vendor[],
  assumptions: Assumption[],
  geography: string,
): TamBreakdown {
  const included = vendors.filter((v) => v.status === "Included" && v.mappingStatus !== "excluded");
  const vendorRevenueSum = included.reduce(
    (s, v) => s + (v.segmentRevenue ?? v.revenue),
    0,
  );

  const growth =
    (assumptions.find((a) => a.name === "Market Growth Rate")?.value ?? 14) / 100;
  const privateFactor =
    assumptions.find((a) => a.name === "Private Company Factor")?.value ?? 1.08;
  const segmentAdj =
    assumptions.find((a) => a.name === "Segment Adjustment Factor")?.value ?? 1.0;
  const intlShare =
    (assumptions.find((a) => a.name === "International Share")?.value ?? 0) / 100;

  const privateCompanyAdjustment = vendorRevenueSum * (privateFactor - 1);
  const internationalAdjustment =
    geography === "United States" ? 0 : vendorRevenueSum * intlShare * 0.15;
  const otherAdjustments = vendorRevenueSum * segmentAdj * growth * 0.05;

  const tam =
    vendorRevenueSum * segmentAdj * (1 + growth) +
    privateCompanyAdjustment +
    internationalAdjustment +
    otherAdjustments;

  return {
    vendorRevenueSum,
    privateCompanyAdjustment,
    internationalAdjustment,
    otherAdjustments,
    tam,
  };
}
