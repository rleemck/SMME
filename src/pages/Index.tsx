import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useModel } from "@/store/ModelStore";
import { TaxonomySelector } from "@/components/taxonomy/TaxonomySelector";
import { ArrowRight, FileText, Layers, Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Index() {
  const navigate = useNavigate();
  const {
    market,
    setMarket,
    primarySegment,
    generateScoping,
    scopingLoading,
    useTaxonomy,
    setUseTaxonomy,
    resetAssumptions,
  } = useModel();
  const [geo, setGeo] = useState(market.geography);
  const [tf, setTf] = useState(market.timeframe);
  const [defaults, setDefaults] = useState(true);
  const [excel, setExcel] = useState(true);

  const submit = async () => {
    if (!primarySegment) {
      toast.error("Select a taxonomy segment to define your market.");
      return;
    }
    setMarket({
      name: primarySegment.name,
      description: primarySegment.expandedDefinition ?? primarySegment.definition ?? primarySegment.name,
      geography: geo,
      timeframe: tf,
      marketType: primarySegment.isHorizontal === false ? "vertical" : "horizontal",
      dataSource: "SEC / public company filings",
    });
    if (defaults) resetAssumptions();
    await generateScoping();
    navigate("/scoping");
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="mds-eyebrow mb-2">Market Definition</div>
        <h1 className="text-3xl font-semibold text-mds-navy">Define your software market</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Select a segment from the McKinsey software market taxonomy. The Scoping Expert will match public
          vendors using expanded definitions and SEC filings, then map revenue into the model workspace.
        </p>
      </div>

      <div className="rounded-lg border bg-card shadow-sm p-7">
        <div className="space-y-6">
          <TaxonomySelector />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Geography</Label>
              <Select value={geo} onValueChange={setGeo}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="United States">United States</SelectItem>
                  {["Global", "North America", "EMEA", "APAC", "LATAM"].map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Timeframe</Label>
              <Select value={tf} onValueChange={setTf}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025 (latest available)">2025 (latest available)</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2024–2028">2024–2028</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
            {[
              { label: "Use Software Taxonomy", val: useTaxonomy, set: setUseTaxonomy },
              { label: "Use Default Assumptions", val: defaults, set: setDefaults },
              { label: "Apply Excel Formatting", val: excel, set: setExcel },
            ].map(({ label, val, set }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="text-sm">{label}</span>
                <Switch checked={val} onCheckedChange={set} />
              </div>
            ))}
          </div>

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={submit}
            disabled={!primarySegment || scopingLoading}
          >
            {scopingLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Generate Market Model
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-8">
        <KpiCard icon={FileText} label="Taxonomy segments" value="63" />
        <KpiCard icon={Layers} label="Public companies" value="5,300+" />
        <KpiCard icon={Calculator} label="Data source" value="SEC" />
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="mds-kpi">
      <Icon className="h-5 w-5 text-mds-blue mb-2" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold text-mds-navy mt-2">{value}</div>
    </div>
  );
}
