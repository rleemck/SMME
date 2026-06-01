export type Vendor = {
  id: string;
  name: string;
  ticker: string;
  filingType: string;
  revenue: number; // $M
  segment: string;
  confidence: number; // 0-1
  coverage: number; // 0-1
  status: "Included" | "Pending" | "Excluded";
  growth: number; // %
  share: number; // %
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

export const initialVendors: Vendor[] = [
  { id: "v1", name: "CrowdStrike", ticker: "CRWD", filingType: "10-K", revenue: 3060, segment: "Endpoint Security", confidence: 0.96, coverage: 0.92, status: "Included", growth: 36, share: 18 },
  { id: "v2", name: "Palo Alto Networks", ticker: "PANW", filingType: "10-K", revenue: 7520, segment: "Cloud Security", confidence: 0.94, coverage: 0.78, status: "Included", growth: 25, share: 24 },
  { id: "v3", name: "Zscaler", ticker: "ZS", filingType: "10-K", revenue: 1890, segment: "Cloud Security", confidence: 0.92, coverage: 0.88, status: "Included", growth: 34, share: 11 },
  { id: "v4", name: "Okta", ticker: "OKTA", filingType: "10-K", revenue: 2260, segment: "IAM", confidence: 0.89, coverage: 0.71, status: "Included", growth: 16, share: 13 },
  { id: "v5", name: "Fortinet", ticker: "FTNT", filingType: "10-K", revenue: 5300, segment: "Network Security", confidence: 0.82, coverage: 0.55, status: "Pending", growth: 20, share: 17 },
  { id: "v6", name: "SentinelOne", ticker: "S", filingType: "10-K", revenue: 621, segment: "Endpoint Security", confidence: 0.78, coverage: 0.84, status: "Included", growth: 47, share: 4 },
];

export const initialAssumptions: Assumption[] = [
  { id: "a1", name: "Growth Rate", defaultValue: 14, value: 14, unit: "%", source: "Gartner 2024", description: "Average annual market growth rate.", editable: true },
  { id: "a2", name: "Penetration Rate", defaultValue: 62, value: 62, unit: "%", source: "IDC Tracker", description: "Enterprise penetration of cloud security.", editable: true },
  { id: "a3", name: "Expansion Factor", defaultValue: 1.15, value: 1.15, unit: "x", source: "Internal benchmark", description: "Multiplier for adjacent revenue coverage.", editable: true },
  { id: "a4", name: "International Share", defaultValue: 38, value: 38, unit: "%", source: "SEC filings rollup", description: "Share of revenue from outside North America.", editable: true },
  { id: "a5", name: "SMB Weighting", defaultValue: 22, value: 22, unit: "%", source: "Forrester 2024", description: "Weight applied to SMB-segment revenue.", editable: true },
];

export const initialTree: IssueNode = {
  id: "root", label: "TAM — Cloud Security Software",
  children: [
    { id: "s1", label: "Cloud Security", children: [
      { id: "v2n", label: "Palo Alto Networks" },
      { id: "v3n", label: "Zscaler" },
      { id: "asum1", label: "Assumptions: Growth 25%, Penetration 62%" },
    ]},
    { id: "s2", label: "Endpoint Security", children: [
      { id: "v1n", label: "CrowdStrike" },
      { id: "v6n", label: "SentinelOne" },
    ]},
    { id: "s3", label: "IAM", children: [{ id: "v4n", label: "Okta" }] },
  ],
};

export const taxonomy = {
  primary: "Cybersecurity",
  subsegments: ["Cloud Security", "IAM", "Endpoint Security", "Network Security", "Data Security"],
  keywords: ["CSPM", "CWPP", "Zero Trust", "SASE", "XDR", "CNAPP", "SIEM"],
};
