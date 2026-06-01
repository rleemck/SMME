import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useModel } from "@/store/ModelStore";
import { ArrowRight, FileText, Layers, Calculator } from "lucide-react";

const EXAMPLES = ["Cloud Security Software", "CRM Software", "Vertical SaaS for Healthcare", "FinOps Platforms", "Observability Software"];

export default function Index() {
  const navigate = useNavigate();
  const { market, setMarket } = useModel();
  const [desc, setDesc] = useState(market.description);
  const [geo, setGeo] = useState(market.geography);
  const [tf, setTf] = useState(market.timeframe);
  const [taxonomy, setTaxonomy] = useState(true);
  const [defaults, setDefaults] = useState(true);
  const [excel, setExcel] = useState(true);

  const submit = () => {
    setMarket({ name: desc || "Untitled Market", description: desc, geography: geo, timeframe: tf });
    navigate("/scoping");
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="mds-eyebrow mb-2">Market Definition</div>
        <h1 className="text-3xl font-semibold text-mds-navy">Define your software market</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Describe the market in plain language. The Scoping Expert will map it to taxonomy segments, suggest vendors, and ingest revenue data to produce a preliminary TAM.
        </p>
      </div>

      <div className="rounded-lg border bg-card shadow-sm p-7">
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-medium">Market Description</Label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              placeholder="e.g. Cloud Security Software for enterprise workloads"
              className="mt-2 resize-none"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs text-muted-foreground self-center mr-1">Examples:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setDesc(ex)}
                  className="text-xs px-2.5 py-1 rounded border bg-surface-muted hover:bg-secondary transition"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Geography</Label>
              <Select value={geo} onValueChange={setGeo}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Global", "North America", "EMEA", "APAC", "LATAM"].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Timeframe</Label>
              <Select value={tf} onValueChange={setTf}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["2023", "2024", "2024–2026", "2024–2028", "2025–2030"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <OptionToggle icon={Layers} label="Use Software Taxonomy" desc="Map to MDS taxonomy" value={taxonomy} onChange={setTaxonomy} />
            <OptionToggle icon={Calculator} label="Use Default Assumptions" desc="Pre-load benchmarks" value={defaults} onChange={setDefaults} />
            <OptionToggle icon={FileText} label="Apply Excel Formatting" desc="Enforce house style" value={excel} onChange={setExcel} />
          </div>

          <div className="pt-4 flex justify-end">
            <Button size="lg" onClick={submit} className="gap-2">
              Generate Market Model <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <KpiCard label="Templates available" value="12" />
        <KpiCard label="Vendors in DB" value="2,840" />
        <KpiCard label="Avg. model build time" value="4 min" />
      </div>
    </div>
  );
}

function OptionToggle({ icon: Icon, label, desc, value, onChange }: any) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-md border bg-surface-muted">
      <Icon className="h-5 w-5 text-mds-blue mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="mds-kpi">
      <div className="mds-eyebrow">{label}</div>
      <div className="text-2xl font-semibold text-mds-navy mt-2">{value}</div>
    </div>
  );
}
