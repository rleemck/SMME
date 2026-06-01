import type { SelectedTaxonomySegment, TaxonomyLevel, TaxonomySelection } from "@/types/taxonomy";

const SELECTABLE_LEVELS = new Set(["L3", "L4", "L5"]);

export function isSelectableSegmentLevel(level: TaxonomyLevel): boolean {
  return SELECTABLE_LEVELS.has(level);
}

export function selectionToSegment(sel: TaxonomySelection, isPrimary: boolean): SelectedTaxonomySegment {
  const level = sel.level as SelectedTaxonomySegment["level"];
  return {
    id: sel.nodeId,
    name: sel.name,
    level: ["L1", "L2", "L3", "L4", "L5"].includes(level) ? level : "L3",
    path: sel.path,
    definition: sel.definition,
    expandedDefinition: sel.expandedDefinition,
    isPrimary,
  };
}

export function segmentToSelection(seg: SelectedTaxonomySegment): TaxonomySelection {
  return {
    nodeId: seg.id,
    name: seg.name,
    path: seg.path,
    level: seg.level,
    definition: seg.definition,
    expandedDefinition: seg.expandedDefinition,
  };
}

export function segmentsFromLegacy(
  primary: TaxonomySelection | null,
  adjacent: TaxonomySelection[],
): SelectedTaxonomySegment[] {
  if (!primary) return [];
  return [
    selectionToSegment(primary, true),
    ...adjacent.map((a) => selectionToSegment(a, false)),
  ];
}

export function primaryFromSegments(segments: SelectedTaxonomySegment[]): TaxonomySelection | null {
  const p = segments.find((s) => s.isPrimary) ?? segments[0];
  return p ? segmentToSelection(p) : null;
}

export function adjacentFromSegments(segments: SelectedTaxonomySegment[]): TaxonomySelection[] {
  return segments.filter((s) => !s.isPrimary).map(segmentToSelection);
}
