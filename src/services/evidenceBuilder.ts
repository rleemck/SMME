import { collectFilingNarrativeText, stripXbrlBoilerplate } from "@/lib/filingNarrative";
import {
  cleanFilingParagraph,
  excerptForEvidence,
  findRelevantSentences,
  isLowQualityFilingText,
} from "@/lib/filingTextParser";
import type { EvidenceCard, EvidenceStrength, TaxonomyConceptMatch, ConfidenceRationaleLine } from "@/types/evidence";
import type { ConfidenceBreakdown, SelectedTaxonomySegment } from "@/types/taxonomy";
import type { SECRevenueSource } from "@/types/sec";

const IAM_CONCEPTS = [
  "Authentication",
  "Multi-Factor Authentication",
  "Identity Governance",
  "Privileged Access Management",
  "Directory Services",
  "Single Sign-On",
  "Access Control",
  "User Provisioning",
  "Identity Protection",
  "Zero Trust",
];

const CONCEPT_KEYWORDS: Record<string, string[]> = {
  Authentication: ["authentication", "authenticate", "login", "credential"],
  "Multi-Factor Authentication": ["multi-factor", "mfa", "two-factor", "2fa"],
  "Identity Governance": ["identity governance", "identity lifecycle", "access governance"],
  "Privileged Access Management": ["privileged access", "pam ", "privileged identity"],
  "Directory Services": ["directory service", "active directory", "ldap", "identity directory"],
  "Single Sign-On": ["single sign-on", "single sign on", "sso"],
  "Access Control": ["access control", "access management", "access policy", "authorization"],
  "User Provisioning": ["provisioning", "de-provisioning", "user provisioning", "onboarding"],
  "Identity Protection": ["identity protection", "identity security", "identity threat"],
  "Zero Trust": ["zero trust", "ztna", "zero-trust"],
};

function strengthFromScore(score: number): EvidenceStrength {
  if (score >= 75) return "Strong";
  if (score >= 50) return "Medium";
  return "Weak";
}

function filingMeta(sec: SECRevenueSource) {
  return {
    filingDate: sec.filingDate ?? "—",
    filingType: sec.formType ?? "10-K",
    filingUrl: sec.filingUrl ?? "",
  };
}

export function extractTaxonomyConcepts(segments: SelectedTaxonomySegment[]): string[] {
  const text = segments
    .map((s) => `${s.expandedDefinition ?? s.definition ?? s.name}`)
    .join(" ")
    .toLowerCase();

  const concepts: string[] = [];
  if (/iam|identity.*access|access management/i.test(text)) {
    concepts.push(...IAM_CONCEPTS);
  }
  if (/single sign-on|sso/i.test(text) && !concepts.includes("Single Sign-On")) {
    concepts.push("Single Sign-On");
  }
  if (/endpoint|edr|xdr|threat/i.test(text)) {
    concepts.push("Endpoint Security", "Threat Detection", "Extended Detection and Response");
  }
  if (/siem|soar|security operations/i.test(text)) {
    concepts.push("SIEM", "SOAR", "Security Operations");
  }
  if (/data security|dlp|encryption/i.test(text)) {
    concepts.push("Data Loss Prevention", "Data Security", "Encryption");
  }
  if (concepts.length === 0) {
    const fromDef = (segments[0]?.expandedDefinition ?? segments[0]?.definition ?? "")
      .split(/[,;.]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 8 && p.length < 60);
    concepts.push(...fromDef.slice(0, 8));
  }
  return [...new Set(concepts)].slice(0, 12);
}

export function matchTaxonomyConcepts(
  concepts: string[],
  corpus: string,
): TaxonomyConceptMatch[] {
  const lower = corpus.toLowerCase();
  return concepts.map((concept) => {
    const keys = CONCEPT_KEYWORDS[concept] ?? [concept.toLowerCase()];
    const matched = keys.some((k) => lower.includes(k));
    return { concept, matched };
  });
}

export function keywordsForSegments(segments: SelectedTaxonomySegment[]): string[] {
  return allKeywords(extractTaxonomyConcepts(segments));
}

function allKeywords(concepts: string[]): string[] {
  const out: string[] = [];
  for (const c of concepts) {
    const keys = CONCEPT_KEYWORDS[c] ?? [c.toLowerCase()];
    out.push(...keys, c.toLowerCase());
  }
  return [...new Set(out)];
}

function makeCard(
  partial: Omit<EvidenceCard, "strength" | "strengthScore"> & { strengthScore: number },
  opts?: { strictQuality?: boolean },
): EvidenceCard | null {
  if (!partial.excerpt?.trim()) return null;
  if (opts?.strictQuality !== false && isLowQualityFilingText(partial.excerpt)) return null;
  return {
    ...partial,
    strength: strengthFromScore(partial.strengthScore),
    strengthScore: partial.strengthScore,
  };
}

function buildTaxonomyFitExplanation(
  companyName: string,
  segmentLabel: string,
  segmentDefinition: string,
  matched: TaxonomyConceptMatch[],
): string {
  const hits = matched.filter((m) => m.matched).map((m) => m.concept);
  const defSnippet = segmentDefinition.slice(0, 120).trim();
  if (hits.length >= 2) {
    return `You scoped ${segmentLabel}${defSnippet ? ` (${defSnippet}${segmentDefinition.length > 120 ? "…" : ""})` : ""}. ${companyName}'s 10-K uses language consistent with ${hits.slice(0, 5).join(", ")} — core signals for this market.`;
  }
  if (hits.length === 1) {
    return `You scoped ${segmentLabel}. The 10-K references ${hits[0]}, which supports classifying ${companyName} in this market; review the excerpt for breadth of IAM/security offerings.`;
  }
  return `You scoped ${segmentLabel}. The 10-K business description was reviewed; explicit IAM vocabulary is limited, so fit is based on broader security/platform language in Item 1.`;
}

export type EvidenceBuildOptions = {
  /** Step 1 scoping: 10-K narrative only, no taxonomy checklist or XBRL revenue cards */
  forScoping?: boolean;
};

export function buildVendorEvidenceCards(
  companyName: string,
  sec: SECRevenueSource | undefined,
  segments: SelectedTaxonomySegment[],
  companyDescription?: string,
  options?: EvidenceBuildOptions,
): EvidenceCard[] {
  const forScoping = options?.forScoping ?? false;
  const primary = segments.find((s) => s.isPrimary) ?? segments[0];
  const concepts = extractTaxonomyConcepts(segments);
  const keywords = allKeywords(concepts);

  const corpus = [companyDescription ?? "", collectFilingNarrativeText(sec)].join(" ").trim();
  const segmentDefinition =
    primary?.expandedDefinition ?? primary?.definition ?? primary?.name ?? "";

  const meta = sec
    ? filingMeta(sec)
    : { filingDate: "—", filingType: "—", filingUrl: "" };

  const cards: EvidenceCard[] = [];
  const segmentLabel = primary?.name ?? "selected market segment";

  const rawBusiness =
    sec?.businessExcerpt ||
    excerptForEvidence(sec?.mdaExcerpt ?? "", 400) ||
    excerptForEvidence(stripXbrlBoilerplate(sec?.sourceExcerpt ?? ""), 400);

  if (rawBusiness || sec?.businessExcerpt) {
    const leadSource = sec?.businessExcerpt || rawBusiness;
    const leadExcerpt =
      excerptForEvidence(leadSource, forScoping ? 520 : 380) ||
      cleanFilingParagraph(leadSource, forScoping ? 520 : 380);
    if (leadExcerpt) {
      const lead = makeCard({
        sourceType: "SEC_BUSINESS_DESCRIPTION",
        excerpt: leadExcerpt,
        explanation: forScoping
          ? `${companyName}'s latest ${meta.filingType} Item 1 (Business) describes what the company sells and who it serves. This is the primary basis for including the vendor in ${segmentLabel}.`
          : `Item 1 Business from the latest ${meta.filingType} describes how ${companyName} positions its products relative to ${segmentLabel}.`,
        strengthScore: 95,
        ...meta,
      });
      if (lead) cards.push(lead);
    }

    const sentences = findRelevantSentences(leadSource || corpus, keywords, forScoping ? 3 : 2);
    for (const sentence of sentences) {
      const hits = concepts.filter((c) => {
        const keys = CONCEPT_KEYWORDS[c] ?? [c.toLowerCase()];
        return keys.some((k) => sentence.toLowerCase().includes(k));
      });
      const card = makeCard({
        sourceType: "SEC_BUSINESS_DESCRIPTION",
        excerpt: sentence,
        explanation: forScoping
          ? hits.length > 0
            ? `This passage from the 10-K links ${companyName}'s offerings to ${segmentLabel} (e.g. ${hits.slice(0, 3).join(", ")}).`
            : `Additional business narrative from the 10-K supporting relevance to ${segmentLabel}.`
          : hits.length > 0
            ? `Direct mention of ${hits.slice(0, 3).join(", ")} aligns with "${segmentLabel}".`
            : `Business description language overlaps with the selected market definition.`,
        strengthScore: hits.length >= 2 ? 90 : hits.length === 1 ? 82 : 70,
        ...meta,
      });
      if (card) cards.push(card);
    }
  }

  if (sec?.mdaExcerpt) {
    const sentences = findRelevantSentences(sec.mdaExcerpt, keywords, forScoping ? 2 : 1);
    for (const sentence of sentences) {
      const card = makeCard({
        sourceType: "SEC_PRODUCT_DISCLOSURE",
        excerpt: sentence,
        explanation: `MD&A discussion references capabilities relevant to ${segmentLabel}.`,
        strengthScore: 74,
        ...meta,
      });
      if (card) cards.push(card);
    }
  }

  if (forScoping && corpus.length > 40) {
    const conceptMatches = matchTaxonomyConcepts(concepts, corpus);
    const fitSentence =
      findRelevantSentences(corpus, keywords, 1)[0] ||
      excerptForEvidence(corpus, 420) ||
      cleanFilingParagraph(corpus, 420);
    if (fitSentence) {
      const matched = conceptMatches.filter((m) => m.matched);
      const fitCard = makeCard(
        {
          sourceType: "SEC_BUSINESS_DESCRIPTION",
          excerpt: fitSentence,
          explanation: buildTaxonomyFitExplanation(
            companyName,
            segmentLabel,
            segmentDefinition,
            conceptMatches,
          ),
          strengthScore: matched.length >= 3 ? 88 : matched.length >= 1 ? 76 : 62,
          ...meta,
        },
        { strictQuality: false },
      );
      if (fitCard && !cards.some((c) => c.excerpt === fitCard.excerpt)) cards.push(fitCard);
    }
  }

  if (!sec?.businessExcerpt && companyDescription && forScoping) {
    const card = makeCard({
      sourceType: "SEC_BUSINESS_DESCRIPTION",
      excerpt: companyDescription.slice(0, 400),
      explanation: `${companyName} is included in ${segmentLabel} based on company profile data; connect live SEC EDGAR (dev server) for 10-K Item 1 quotes.`,
      strengthScore: 45,
      ...meta,
    });
    if (card) cards.push(card);
  }

  if (!forScoping) {
    const productHits = concepts.filter((c) => {
      const keys = CONCEPT_KEYWORDS[c] ?? [c.toLowerCase()];
      return keys.some((k) => corpus.toLowerCase().includes(k));
    });
    if (productHits.length >= 2) {
      const card = makeCard({
        sourceType: "SEC_PRODUCT_DISCLOSURE",
        excerpt: `Products and capabilities mentioned in SEC filings include: ${productHits.slice(0, 6).join(", ")}.`,
        explanation: `Product portfolio terms in the filing map to core concepts in "${segmentLabel}".`,
        strengthScore: productHits.length >= 4 ? 78 : 65,
        ...meta,
      });
      if (card) cards.push(card);
    }

    if (sec?.segmentDisclosureExcerpt) {
      const excerpt = cleanFilingParagraph(sec.segmentDisclosureExcerpt, 360);
      const card = makeCard({
        sourceType: "SEC_SEGMENT_DISCLOSURE",
        excerpt,
        explanation: `Segment reporting discusses revenue or operations tied to offerings in ${segmentLabel}.`,
        strengthScore: 68,
        ...meta,
      });
      if (card) cards.push(card);
    } else if (sec?.totalCompanyRevenue != null && sec.revenueMetric !== "—") {
      const card = makeCard({
        sourceType: "SEC_SEGMENT_DISCLOSURE",
        excerpt: `Total company revenue: $${sec.totalCompanyRevenue.toLocaleString()}M (${sec.revenueMetric}, period per XBRL).`,
        explanation: `Company-level revenue is disclosed in the filing; segment-specific line items may be embedded in broader platform reporting.`,
        strengthScore: 58,
        ...meta,
      });
      if (card) cards.push(card);
    }

    const conceptMatches = matchTaxonomyConcepts(concepts, corpus);
    const matched = conceptMatches.filter((m) => m.matched);
    const notFound = conceptMatches.filter((m) => !m.matched);
    const taxonomyExcerpt = [
      `Selected Taxonomy: ${primary?.name ?? "—"}`,
      "",
      "Matched Concepts:",
      ...matched.map((m) => `✓ ${m.concept}`),
      notFound.length ? "" : undefined,
      notFound.length ? "Not Found:" : undefined,
      ...notFound.map((m) => `✗ ${m.concept}`),
    ]
      .filter((line) => line !== undefined)
      .join("\n");

    cards.push({
      sourceType: "TAXONOMY_MATCH",
      excerpt: taxonomyExcerpt,
      explanation: `${matched.length} of ${concepts.length} taxonomy concepts appear in SEC business/product language for this vendor.`,
      strength: strengthFromScore(matched.length >= 3 ? 62 : 48),
      strengthScore: matched.length >= 3 ? 62 : 48,
      ...meta,
    });
  }

  return cards.sort((a, b) => b.strengthScore - a.strengthScore);
}

export function buildStructuredConfidenceRationale(
  confidence: number,
  breakdown: ConfidenceBreakdown,
  cards: EvidenceCard[],
  segments: SelectedTaxonomySegment[],
  context?: { companyName?: string; forScoping?: boolean },
): string {
  const pct = Math.round(confidence * 100);
  const primary = segments.find((s) => s.isPrimary) ?? segments[0];
  const segmentLabel = primary?.name ?? "selected segment";
  const company = context?.companyName ?? "This vendor";
  const forScoping = context?.forScoping ?? false;
  const lines: ConfidenceRationaleLine[] = [];

  const topBusiness = cards.find((c) => c.sourceType === "SEC_BUSINESS_DESCRIPTION");
  const filingRef =
    topBusiness?.filingType && topBusiness.filingDate !== "—"
      ? `${topBusiness.filingType} filed ${topBusiness.filingDate}`
      : "latest SEC filing";

  if (topBusiness && topBusiness.strengthScore >= 70) {
    lines.push({
      sign: "+",
      points: 22,
      label: `Item 1 Business (${filingRef}) describes relevant products/services`,
    });
  }

  const strongBusiness = cards.filter(
    (c) => c.sourceType === "SEC_BUSINESS_DESCRIPTION" && c.strengthScore >= 75,
  ).length;
  if (strongBusiness > 1) {
    lines.push({
      sign: "+",
      points: Math.min(18, 8 + strongBusiness * 3),
      label: "Multiple 10-K passages support market fit",
    });
  }

  const productCard = cards.find(
    (c) => c.sourceType === "SEC_PRODUCT_DISCLOSURE" && c.strengthScore >= 65,
  );
  if (productCard) {
    lines.push({ sign: "+", points: 12, label: "MD&A / product discussion supports positioning" });
  }

  if (breakdown.productDescriptionMatch >= 0.45) {
    lines.push({
      sign: "+",
      points: Math.round(breakdown.productDescriptionMatch * 18),
      label: `Filing language overlaps ${segmentLabel} definition`,
    });
  } else if (breakdown.taxonomyTermMatch >= 0.4) {
    lines.push({
      sign: "+",
      points: Math.round(breakdown.taxonomyTermMatch * 15),
      label: "Taxonomy keywords appear in SEC text",
    });
  }

  if (breakdown.filingEvidenceQuality >= 0.5) {
    lines.push({ sign: "+", points: 8, label: "Live SEC filing retrieved successfully" });
  }

  if (!forScoping && breakdown.segmentRevenueEvidence >= 0.5) {
    lines.push({ sign: "+", points: 8, label: "Reported revenue available from filing" });
  }

  if (!topBusiness || topBusiness.strengthScore < 60) {
    lines.push({ sign: "-", points: 18, label: "Weak or missing Item 1 business description" });
  }
  if (forScoping && breakdown.productDescriptionMatch < 0.45) {
    lines.push({
      sign: "-",
      points: 14,
      label: `Limited explicit link to ${segmentLabel} in 10-K text`,
    });
  }
  if (!forScoping) {
    const taxonomyCard = cards.find((c) => c.sourceType === "TAXONOMY_MATCH");
    if (taxonomyCard?.excerpt.includes("Not found")) {
      lines.push({ sign: "-", points: 12, label: "Some taxonomy concepts not explicit in filing" });
    }
  }
  if (breakdown.negativeSignals > 0) {
    lines.push({ sign: "-", points: Math.round(breakdown.negativeSignals * 100), label: "SEC retrieval or match concerns" });
  }

  const whyBlock = lines.map((l) => `${l.sign}${l.points}% ${l.label}`).join("\n");
  const excerptHint = topBusiness
    ? `\n\nKey filing excerpt (Item 1):\n"${topBusiness.excerpt.slice(0, 200)}${topBusiness.excerpt.length > 200 ? "…" : ""}"`
    : "";

  const summary = forScoping
    ? `${company} is proposed for ${segmentLabel} because its ${filingRef} explains what the company does in language that maps to this market.`
    : `${company} aligns with ${segmentLabel} based on SEC disclosures and taxonomy overlap.`;

  return `Confidence: ${pct}%

${summary}

Why:
${whyBlock || "+0% Baseline from available SEC filing text"}

Final confidence: ${pct}%
Primary segment: ${segmentLabel}${excerptHint}`;
}
