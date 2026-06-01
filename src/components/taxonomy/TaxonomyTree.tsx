import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Minus } from "lucide-react";
import type { TaxonomyNode, TaxonomySelection } from "@/types/taxonomy";
import { cn } from "@/lib/utils";
import { flatToSelection, getDefaultExpandedIds, levelDepth } from "@/lib/taxonomy";
import { Badge } from "@/components/ui/badge";
import { getTaxonomyNode } from "@/lib/taxonomy";

type Props = {
  roots: TaxonomyNode[];
  selectedId?: string | null;
  selectedIds?: string[];
  onSelect: (sel: TaxonomySelection) => void;
};

function TreeNode({
  node,
  selectedId,
  selectedIds,
  onSelect,
  expanded,
  toggle,
}: {
  node: TaxonomyNode;
  selectedId: string | null;
  selectedIds?: string[];
  onSelect: (sel: TaxonomySelection) => void;
  expanded: Set<string>;
  toggle: (id: string) => void;
}) {
  const flat = getTaxonomyNode(node.id);
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const depth = levelDepth(node.level);
  const showExpand = depth >= 3; // L4+ collapsible by default

  const isSelected =
    selectedId === node.id || (selectedIds?.includes(node.id) ?? false);

  const handleSelect = () => {
    const sel: TaxonomySelection = flat
      ? flatToSelection(flat)
      : {
          nodeId: node.id,
          name: node.name,
          path: node.path,
          level: node.level,
          definition: node.definition,
          expandedDefinition: node.expandedDefinition,
          isHorizontal: node.isHorizontal,
          additiveToSoftwareMarket: node.additiveToSoftwareMarket,
        };
    onSelect(sel);
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer text-sm",
          isSelected ? "bg-mds-navy text-white" : "hover:bg-surface-muted",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="shrink-0 p-0.5 rounded hover:bg-black/10"
            onClick={(e) => {
              e.stopPropagation();
              toggle(node.id);
            }}
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {showExpand ? (
              isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />
            ) : isOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <button type="button" className="flex-1 text-left flex items-center gap-2 min-w-0" onClick={handleSelect}>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] shrink-0",
              isSelected && "border-white/40 text-white",
            )}
          >
            {node.level}
          </Badge>
          <span className="truncate font-medium">{node.name}</span>
        </button>
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              selectedId={selectedId}
              selectedIds={selectedIds}
              onSelect={onSelect}
              expanded={expanded}
              toggle={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TaxonomyTree({ roots, selectedId = null, selectedIds, onSelect }: Props) {
  const [expanded, setExpanded] = useState(() => getDefaultExpandedIds());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const displayRoots = useMemo(() => {
    // Show Tech & Software entry: if single Horizontal root, show its children from L1
    if (roots.length === 1 && roots[0].name === "Horizontal") {
      const tech = roots[0].children.find((c) => c.name === "Tech");
      if (tech) return [tech];
    }
    return roots;
  }, [roots]);

  return (
    <div className="border rounded-md bg-card max-h-[420px] overflow-y-auto p-2">
      {displayRoots.map((r) => (
        <TreeNode
          key={r.id}
          node={r}
          selectedId={selectedId}
          selectedIds={selectedIds}
          onSelect={onSelect}
          expanded={expanded}
          toggle={toggle}
        />
      ))}
    </div>
  );
}
