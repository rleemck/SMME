import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchTaxonomy, flatToSelection } from "@/lib/taxonomy";
import type { TaxonomySelection } from "@/types/taxonomy";
import { Badge } from "@/components/ui/badge";

type Props = {
  onPick: (sel: TaxonomySelection) => void;
};

export function TaxonomySearch({ onPick }: Props) {
  const [q, setQ] = useState("");
  const results = searchTaxonomy(q);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search taxonomy segments…"
          className="pl-9"
        />
      </div>
      {q && (
        <ul className="border rounded-md max-h-40 overflow-y-auto divide-y bg-card">
          {results.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No segments found.</li>
          )}
          {results.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className="w-full text-left p-2.5 hover:bg-surface-muted text-sm"
                onClick={() => {
                  onPick(flatToSelection(n));
                  setQ("");
                }}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {n.level}
                  </Badge>
                  <span className="font-medium">{n.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{n.path.join(" › ")}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
