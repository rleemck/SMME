import { LayoutTemplate, Shield, Cloud, Heart, DollarSign, ShoppingCart, Cpu } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";

const TEMPLATES = [
  { name: "Cloud Security TAM", icon: Shield, desc: "Endpoint, IAM, Cloud, Network", vendors: 24, tam: "$78B" },
  { name: "CRM Software", icon: Cloud, desc: "Sales, Marketing, Service Cloud", vendors: 18, tam: "$96B" },
  { name: "Vertical SaaS — Healthcare", icon: Heart, desc: "EHR, RCM, Telehealth", vendors: 31, tam: "$42B" },
  { name: "FinTech Infrastructure", icon: DollarSign, desc: "Payments, BaaS, Lending", vendors: 22, tam: "$58B" },
  { name: "Retail & Commerce", icon: ShoppingCart, desc: "Headless commerce, POS", vendors: 19, tam: "$34B" },
  { name: "DevTools & Observability", icon: Cpu, desc: "APM, CI/CD, IDP", vendors: 27, tam: "$51B" },
];

export default function Templates() {
  return (
    <PageShell>
      <div className="mds-eyebrow mb-1">Library</div>
      <h1 className="text-2xl font-semibold text-mds-navy mb-6">Templates</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((t) => (
          <div key={t.name} className="rounded-lg border bg-card shadow-sm p-5 hover:border-mds-blue transition cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-md bg-mds-blue/10 grid place-items-center text-mds-blue group-hover:bg-mds-blue group-hover:text-white transition">
                <t.icon className="h-5 w-5" />
              </div>
              <span className="text-xs text-muted-foreground">TAM {t.tam}</span>
            </div>
            <h3 className="text-sm font-semibold text-mds-navy mt-4">{t.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
            <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-muted-foreground">
              <span>{t.vendors} vendors</span>
              <span className="text-mds-blue font-medium">Use template →</span>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
