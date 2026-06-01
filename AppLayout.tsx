import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useModel } from "@/store/ModelStore";
import { Sparkles, AlertTriangle } from "lucide-react";

export default function AssumptionEditor({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { assumptions, setAssumption, resetAssumptions } = useModel();
  const growth = assumptions.find((a) => a.name === "Growth Rate")?.value ?? 14;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Assumption Editor</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assumption</TableHead>
                <TableHead className="text-right">Default</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assumptions.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{a.defaultValue}{a.unit}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step={a.unit === "x" ? 0.05 : 1}
                      value={a.value}
                      onChange={(e) => setAssumption(a.id, Number(e.target.value))}
                      className="h-8 w-24 ml-auto text-right tabular-nums"
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-sm">{a.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-md border bg-mds-blue/5 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-mds-blue mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-mds-navy">AI Insight</div>
              <div className="text-sm text-muted-foreground mt-1 flex items-start gap-2">
                {growth > 20 ? (
                  <><AlertTriangle className="h-4 w-4 text-mds-warning mt-0.5" />Growth assumptions ({growth}%) exceed software market benchmarks (12–16% per Gartner 2024). Consider scenario-testing at 14% and 18%.</>
                ) : (
                  <>Current assumptions are within Gartner/IDC consensus bands. Expansion Factor sensitivity drives ±8% TAM variance.</>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAssumptions}>Reset to Default</Button>
          <Button onClick={() => onOpenChange(false)}>Apply Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
