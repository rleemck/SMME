import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Circle } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";

const INTEGRATIONS = [
  { name: "OpenAI API", desc: "LLM reasoning & summary generation", connected: false },
  { name: "SEC EDGAR API", desc: "Public filings ingestion", connected: false },
  { name: "Software Taxonomy DB", desc: "Mapping rules & segment graph", connected: true },
  { name: "Excel Export Service", desc: "House-style XLSX generation", connected: true },
  { name: "Authentication (SSO)", desc: "SAML SSO via workspace", connected: false },
  { name: "PostgreSQL", desc: "Persistent model storage", connected: false },
];

export default function Settings() {
  return (
    <PageShell narrow>
      <div className="mds-eyebrow mb-1">Workspace</div>
      <h1 className="text-2xl font-semibold text-mds-navy mb-6">Settings</h1>

      <section className="rounded-lg border bg-card shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-mds-navy mb-4">Preferences</h3>
        <div className="space-y-4">
          {["Live model recalculation", "Apply Excel formatting rules", "Show AI Copilot suggestions", "Enable taxonomy auto-mapping"].map((p) => (
            <div key={p} className="flex items-center justify-between">
              <span className="text-sm">{p}</span>
              <Switch defaultChecked />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-card shadow-sm p-5">
        <h3 className="text-sm font-semibold text-mds-navy mb-4">Integrations</h3>
        <div className="divide-y">
          {INTEGRATIONS.map((i) => (
            <div key={i.name} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                {i.connected ? <CheckCircle2 className="h-5 w-5 text-mds-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <div className="text-sm font-medium">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{i.desc}</div>
                </div>
              </div>
              <button className="text-xs font-medium text-mds-blue hover:underline">
                {i.connected ? "Manage" : "Connect"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
