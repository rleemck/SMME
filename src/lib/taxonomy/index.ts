import type { TaxonomyFlatNode, TaxonomyNode, TaxonomySelection } from "@/types/taxonomy";
import treeData from "@/data/taxonomy-tree.json";
import flatData from "@/data/taxonomy-flat.json";

export const taxonomyTree = treeData as TaxonomyNode;
export const taxonomyFlat = flatData as TaxonomyFlatNode[];

const nodeById = new Map(taxonomyFlat.map((n) => [n.id, n]));

export function getTaxonomyNode(id: string): TaxonomyFlatNode | undefined {
  return nodeById.get(id);
}

export function flatToSelection(node: TaxonomyFlatNode): TaxonomySelection {
  return {
    nodeId: node.id,
    name: node.name,
    path: node.path,
    level: node.level,
    definition: node.definition,
    expandedDefinition: node.expandedDefinition,
    isHorizontal: node.isHorizontal,
    additiveToSoftwareMarket: node.additiveToSoftwareMarket,
  };
}

export function searchTaxonomy(query: string, limit = 30): TaxonomyFlatNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return taxonomyFlat
    .filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.path.join(" ").toLowerCase().includes(q) ||
        (n.expandedDefinition?.toLowerCase().includes(q) ?? false),
    )
    .slice(0, limit);
}

/** Top-level browse roots: Horizontal / Vertical under synthetic root */
export function getTaxonomyRoots(): TaxonomyNode[] {
  if (taxonomyTree.name === "Root" && taxonomyTree.children?.length) {
    return taxonomyTree.children;
  }
  return [taxonomyTree];
}

export function getDefaultExpandedIds(): Set<string> {
  const ids = new Set<string>();
  taxonomyFlat.forEach((n) => {
    if (["L0", "L1", "L2", "L3"].includes(n.level)) ids.add(n.id);
  });
  return ids;
}

export function levelDepth(level: string): number {
  const n = parseInt(level.replace("L", ""), 10);
  return Number.isNaN(n) ? 0 : n;
}
