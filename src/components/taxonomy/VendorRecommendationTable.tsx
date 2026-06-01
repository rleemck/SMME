import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { Vendor } from "@/lib/mockData";
import { useModel } from "@/store/ModelStore";

export function VendorRecommendationTable() {
  const { vendors, updateVendor } = useModel();

  const toggleInclude = (v: Vendor, included: boolean) => {
    updateVendor(v.id, {
      status: included ? "Included" : "Excluded",
      mappingStatus: included ? "mapped" : "excluded",
    });
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Include</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Ticker</TableHead>
            <TableHead className="text-right">Confidence</TableHead>
            <TableHead>Rationale</TableHead>
            <TableHead>Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((v) => (
            <TableRow key={v.id}>
              <TableCell>
                <Switch
                  checked={v.status === "Included"}
                  onCheckedChange={(c) => toggleInclude(v, c)}
                />
              </TableCell>
              <TableCell className="font-medium">{v.name}</TableCell>
              <TableCell>
                <span className="font-mono text-xs">{v.ticker}</span>
                {v.exchange && (
                  <span className="text-xs text-muted-foreground ml-1">{v.exchange}</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={v.confidence >= 0.85 ? "default" : "outline"}>
                  {Math.round(v.confidence * 100)}%
                </Badge>
                {v.needsReview && (
                  <Badge variant="outline" className="ml-1 text-mds-warning border-mds-warning">
                    Review
                  </Badge>
                )}
              </TableCell>
              <TableCell className="max-w-xs text-xs text-muted-foreground">{v.rationale}</TableCell>
              <TableCell className="max-w-sm">
                <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-3">
                  {(v.supportingEvidence ?? []).slice(0, 2).map((e, i) => (
                    <li key={i} className="line-clamp-2">
                      {e}
                    </li>
                  ))}
                </ul>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {vendors.length === 0 && (
        <p className="p-6 text-sm text-muted-foreground text-center">
          Run Generate to populate vendor recommendations from taxonomy and SEC/AI matching.
        </p>
      )}
    </div>
  );
}
