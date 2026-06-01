/** Filter SEC filing TOC, navigation, and boilerplate — not analyst evidence. */

const TOC_LINE =
  /^(?:item\s+\d+[a-z]?\s*[\.\:]?\s*){2,}|table\s+of\s+contents|page\s+\d+\s+of\s+\d+|part\s+[ivxlc]+\s*$/i;

const BOILERPLATE =
  /forward-looking\s+statements|securities\s+and\s+exchange\s+commission|united\s+states\s+securities/i;

const SECTION_HEADER_ONLY = /^item\s+\d+[a-z]?[\.\s]*[\w\s]{0,40}$/i;

export function isLowQualityFilingText(text: string): boolean {
  const t = text.trim();
  if (t.length < 40) return true;
  if (TOC_LINE.test(t)) return true;
  if (BOILERPLATE.test(t) && t.length < 200) return true;
  if (SECTION_HEADER_ONLY.test(t)) return true;
  const itemCount = (t.match(/item\s+\d+[a-z]?/gi) ?? []).length;
  if (itemCount >= 4 && t.length < 500) return true;
  return false;
}

export function cleanFilingParagraph(text: string, maxLen = 500): string {
  let t = text.replace(/\s+/g, " ").trim();
  if (isLowQualityFilingText(t)) return "";
  if (t.length > maxLen) {
    const cut = t.slice(0, maxLen);
    const last = cut.lastIndexOf(". ");
    t = (last > 120 ? cut.slice(0, last + 1) : cut) + "…";
  }
  return t;
}

export function extractSectionBetween(
  text: string,
  startRe: RegExp,
  endRe: RegExp,
  maxLen = 8000,
): string {
  const cleaned = text.slice(0, 600_000);
  const startMatch = cleaned.match(startRe);
  if (startMatch == null || startMatch.index === undefined) return "";
  const from = startMatch.index + startMatch[0].length;
  const rest = cleaned.slice(from, from + maxLen);
  const endMatch = rest.match(endRe);
  const body = endMatch?.index ? rest.slice(0, endMatch.index) : rest;
  return body.replace(/\s+/g, " ").trim();
}

function firstNonEmptySection(
  plainText: string,
  pairs: { start: RegExp; end: RegExp; maxLen?: number }[],
): string {
  for (const { start, end, maxLen } of pairs) {
    const body = extractSectionBetween(plainText, start, end, maxLen ?? 12000);
    if (body.length > 200) return body;
  }
  return "";
}

export function extractFilingSections(plainText: string): {
  business: string;
  mda: string;
  segment: string;
} {
  const business = firstNonEmptySection(plainText, [
    {
      start: /item\s*1[\.\s:]*\s*business/i,
      end: /item\s*1a[\.\s:]*\s*risk|item\s*2[\.\s:]*\s*financial/i,
      maxLen: 14000,
    },
    {
      start: /part\s+i[^\w]{0,40}item\s*1[\.\s:]*\s*business/i,
      end: /item\s*1a|item\s*2[\.\s:]*\s*financial|part\s+ii\b/i,
      maxLen: 14000,
    },
    {
      start: /item\s*1[\.\s:]*\s*[\.\-–—]?\s*business\s+of\s+the\s+(?:company|registrant)/i,
      end: /item\s*1a|item\s*2\b/i,
      maxLen: 14000,
    },
    {
      start: /business\s+overview/i,
      end: /item\s*1a|risk\s+factors|item\s*2\b/i,
      maxLen: 10000,
    },
  ]);

  const mda = firstNonEmptySection(plainText, [
    {
      start: /item\s*7[\.\s:]*\s*management['']?s\s+discussion/i,
      end: /item\s*7a[\.\s:]*\s*quantitative|item\s*8[\.\s:]*\s*financial/i,
      maxLen: 10000,
    },
    {
      start: /management['']?s\s+discussion\s+and\s+analysis/i,
      end: /item\s*7a|item\s*8\b|quantitative\s+and\s+qualitative/i,
      maxLen: 10000,
    },
  ]);

  const segment = firstNonEmptySection(plainText, [
    {
      start: /(?:segment\s+information|reportable\s+segments|operating\s+segments)/i,
      end: /item\s*\d+[a-z]?[\.\s:]/i,
      maxLen: 6000,
    },
  ]);

  return { business, mda, segment };
}

/** Looser clean for evidence when strict filter would drop valid Item 1 text. */
export function excerptForEvidence(text: string, maxLen = 520): string {
  let t = text.replace(/\s+/g, " ").trim();
  if (t.length < 60) return "";
  if (TOC_LINE.test(t.slice(0, 280)) && t.length < 500) return "";
  if (SECTION_HEADER_ONLY.test(t) && t.length < 120) return "";
  if (t.length > maxLen) {
    const cut = t.slice(0, maxLen);
    const last = cut.lastIndexOf(". ");
    t = (last > 120 ? cut.slice(0, last + 1) : cut) + "…";
  }
  return t;
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 50 && !isLowQualityFilingText(s));
}

export function findRelevantSentences(text: string, keywords: string[], limit = 3): string[] {
  if (!text.trim()) return [];
  const lower = text.toLowerCase();
  const sentences = splitSentences(text);
  const scored = sentences
    .map((s) => {
      const sl = s.toLowerCase();
      const hits = keywords.filter((k) => sl.includes(k.toLowerCase())).length;
      return { s, hits };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return scored.slice(0, limit).map((x) => cleanFilingParagraph(x.s, 420));
}
