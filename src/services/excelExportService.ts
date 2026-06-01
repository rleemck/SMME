import * as XLSX from "xlsx";
import type { TaxonomySelection } from "@/types/taxonomy";
import type { Vendor, Assumption } from "@/lib/mockData";
import type { TamBreakdown } from "./modelCalculation";

export type ExportPayload = {
  marketName: string;
  geography: string;
  timeframe: string;
  primarySegment: TaxonomySelection | null;
  adjacentSegments: TaxonomySelection[];
  vendors: Vendor[];
  assumptions: Assumption[];
  tam: TamBreakdown;
};

export function exportModelWorkbook(payload: ExportPayload): void {
  const wb = XLSX.utils.book_new();

  const summary = [
    ["Software Market Model Engine — Executive Summary"],
    [],
    ["Market", payload.marketName],
    ["Geography", payload.geography],
    ["Timeframe", payload.timeframe],
    ["Primary segment", payload.primarySegment?.path.join(" > ") ?? "—"],
    ["TAM ($M)", Math.round(payload.tam.tam)],
    ["Vendor revenue sum ($M)", Math.round(payload.tam.vendorRevenueSum)],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Executive Summary");

  const tax = [
    ["Taxonomy Selection"],
    ["Level", "Path", "Definition", "Expanded definition"],
    [
      payload.primarySegment?.level ?? "",
      payload.primarySegment?.path.join(" > ") ?? "",
      payload.primarySegment?.definition ?? "",
      payload.primarySegment?.expandedDefinition ?? "",
    ],
    ...payload.adjacentSegments.map((s) => [s.level, s.path.join(" > "), s.definition ?? "", s.expandedDefinition ?? ""]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tax), "Taxonomy Selection");

  const vendors = [
    [
      "Company",
      "Ticker",
      "Exchange",
      "Confidence",
      "Segment revenue ($M)",
      "Segment share",
      "Status",
      "Rationale",
    ],
    ...payload.vendors.map((v) => [
      v.name,
      v.ticker,
      v.exchange ?? "",
      v.confidence,
      v.segmentRevenue ?? v.revenue,
      v.segmentShare ?? "",
      v.mappingStatus ?? v.status,
      v.rationale ?? "",
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vendors), "Vendor Recommendations");

  const assumptions = [
    ["Name", "Default", "User value", "Unit", "Description", "Source"],
    ...payload.assumptions.map((a) => [a.name, a.defaultValue, a.value, a.unit, a.description, a.source]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(assumptions), "Assumptions");

  const formulas = [
    ["Formula Relationships"],
    ["TAM", "= Vendor sum + Private adj + International adj + Other adj"],
    ["Vendor sum", payload.tam.vendorRevenueSum],
    ["Private company adjustment", payload.tam.privateCompanyAdjustment],
    ["International adjustment", payload.tam.internationalAdjustment],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(formulas), "Formula Relationships");

  XLSX.writeFile(wb, `SMME_Export_${payload.marketName.replace(/\W+/g, "_").slice(0, 40)}.xlsx`);
}
