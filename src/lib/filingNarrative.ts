import {
  cleanFilingParagraph,
  extractFilingSections,
  findRelevantSentences,
  isLowQualityFilingText,
} from "@/lib/filingTextParser";
import type { SECRevenueSource } from "@/types/sec";

/** Strip XBRL / revenue-tag lines — not useful as narrative excerpt for users. */
export function stripXbrlBoilerplate(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !/^XBRL tag\b/i.test(line) &&
        !/^Filing retrieved;/i.test(line) &&
        !/us-gaap:/i.test(line),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function collectFilingNarrativeText(sec: SECRevenueSource | undefined): string {
  if (!sec) return "";
  const parts = [
    sec.businessExcerpt,
    sec.mdaExcerpt,
    sec.segmentDisclosureExcerpt,
    stripXbrlBoilerplate(sec.sourceExcerpt ?? ""),
  ].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Best user-facing excerpt from a 10-K (Item 1 first, then MD&A / segment).
 * Optionally bias toward taxonomy keywords (e.g. IAM).
 */
export function getFilingNarrativeExcerpt(
  sec: SECRevenueSource | undefined,
  keywords: string[] = [],
  maxLen = 320,
): string {
  if (!sec) return "";

  const corpus = collectFilingNarrativeText(sec);
  if (keywords.length) {
    const hit = findRelevantSentences(corpus, keywords, 1)[0];
    if (hit) return hit;
  }

  for (const raw of [sec.businessExcerpt, sec.mdaExcerpt, sec.segmentDisclosureExcerpt]) {
    const cleaned = cleanFilingParagraph(raw ?? "", maxLen);
    if (cleaned) return cleaned;
  }

  const fromSource = cleanFilingParagraph(stripXbrlBoilerplate(sec.sourceExcerpt ?? ""), maxLen);
  if (fromSource) return fromSource;

  if (corpus.length >= 80 && !isLowQualityFilingText(corpus.slice(0, 400))) {
    const t = corpus.replace(/\s+/g, " ").trim();
    if (t.length <= maxLen) return t;
    const cut = t.slice(0, maxLen);
    const last = cut.lastIndexOf(". ");
    return (last > 100 ? cut.slice(0, last + 1) : cut) + "…";
  }

  return "";
}

/** Re-parse plain filing text when structured excerpts were empty (e.g. section at index 0). */
export function businessSectionFromPlainText(plainText: string, maxLen = 2200): string {
  const sections = extractFilingSections(plainText);
  return cleanFilingParagraph(sections.business, maxLen);
}
