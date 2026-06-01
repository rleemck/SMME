import { describe, expect, it } from "vitest";
import { buildCombinedDefinition, computeConfidenceBreakdown } from "./confidenceScoring";
import type { SelectedTaxonomySegment } from "@/types/taxonomy";

function seg(
  partial: Partial<SelectedTaxonomySegment> & Pick<SelectedTaxonomySegment, "id" | "name">,
): SelectedTaxonomySegment {
  return {
    level: "L5",
    path: ["Security", partial.name],
    isPrimary: false,
    ...partial,
  };
}

describe("buildCombinedDefinition", () => {
  it("includes primary and adjacent segment text (not empty)", () => {
    const primary = seg({
      id: "iam",
      name: "IAM Software",
      isPrimary: true,
      definition: "identity access management",
      expandedDefinition: "authentication privileged access",
    });
    const adjacent = seg({
      id: "sec",
      name: "Security Software",
      definition: "cybersecurity platform",
    });

    const combined = buildCombinedDefinition([primary, adjacent]);

    expect(combined).toContain("IAM Software");
    expect(combined).toContain("authentication privileged access");
    expect(combined).toContain("Security Software");
    expect(combined).toContain("cybersecurity platform");
    expect(combined.length).toBeGreaterThan(50);
  });

  it("duplicates primary segment text for weighting (~2× token presence)", () => {
    const primary = seg({
      id: "p",
      name: "Primary Segment",
      isPrimary: true,
      definition: "alpha beta gamma",
    });
    const combined = buildCombinedDefinition([primary]);
    const once = (combined.match(/alpha/g) ?? []).length;
    expect(once).toBeGreaterThanOrEqual(2);
  });

  it("does not use repeat/padEnd bug — adjacent-only segments still contribute", () => {
    const adjacent = seg({
      id: "adj",
      name: "Adjacent Only",
      isPrimary: false,
      expandedDefinition: "unique adjacent vocabulary token",
    });
    const combined = buildCombinedDefinition([adjacent]);
    expect(combined).toBe("Adjacent Only unique adjacent vocabulary token");
  });
});

describe("computeConfidenceBreakdown", () => {
  it("uses adjacent segment definitions in scoring (productDescriptionMatch > 0)", () => {
    const primary = seg({
      id: "iam",
      name: "IAM",
      isPrimary: true,
      definition: "identity",
    });
    const adjacent = seg({
      id: "pam",
      name: "Privileged Access",
      isPrimary: false,
      expandedDefinition: "privileged access management vault session",
    });

    const withAdjacent = computeConfidenceBreakdown(
      [primary, adjacent],
      "VendorCo",
      "privileged access management and vault session recording",
      undefined,
    );
    const primaryOnly = computeConfidenceBreakdown(
      [primary],
      "VendorCo",
      "privileged access management and vault session recording",
      undefined,
    );

    expect(withAdjacent.productDescriptionMatch).toBeGreaterThan(0);
    expect(withAdjacent.productDescriptionMatch).toBeGreaterThanOrEqual(
      primaryOnly.productDescriptionMatch,
    );
  });

  it("does not floor all vendors at 55% — stronger filing text scores higher", () => {
    const segments = [
      seg({
        id: "iam",
        name: "IAM Software",
        isPrimary: true,
        definition: "identity access management authentication privileged access",
        expandedDefinition: "single sign-on directory services zero trust",
      }),
    ];

    const weak = computeConfidenceBreakdown(segments, "Okta", undefined, {
      companyName: "Okta",
      ticker: "OKTA",
      retrievalStatus: "unavailable",
      businessExcerpt: "",
      sourceExcerpt: "",
    } as import("@/types/sec").SECRevenueSource);

    const strong = computeConfidenceBreakdown(segments, "Okta", undefined, {
      companyName: "Okta Inc",
      ticker: "OKTA",
      retrievalStatus: "live",
      businessExcerpt:
        "We provide identity and access management, single sign-on, multi-factor authentication, privileged access management, and directory services for enterprises. Our platform enables zero trust security.",
      mdaExcerpt: "Identity security revenue grew driven by authentication and governance products.",
      formType: "10-K",
      filingDate: "2024-03-15",
    } as import("@/types/sec").SECRevenueSource);

    expect(strong.finalConfidence).toBeGreaterThan(weak.finalConfidence);
    expect(strong.finalConfidence).not.toBe(0.55);
    expect(weak.finalConfidence).toBeLessThan(0.55);
  });
});
