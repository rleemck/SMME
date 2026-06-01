import { useNavigate } from "react-router-dom";
import { Compass, LineChart, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { cn } from "@/lib/utils";

export default function Home() {
  const navigate = useNavigate();

  return (
    <PageShell className="max-w-4xl mx-auto">
      <div className="mb-10 text-center md:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground mb-4">
          <Sparkles className="h-3.5 w-3.5 text-mds-blue" />
          Software Market Model Engine
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-mds-navy tracking-tight">
          Hello — what would you like to do?
        </h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed max-w-2xl mx-auto md:mx-0">
          Choose a workflow to get started. You can size a software market with SEC-backed vendors, or
          open the market model engine to build and explore your TAM model.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChoiceCard
          title="Software market sizing"
          subtitle="Software Scoping Expert"
          description="Define your taxonomy segment, match vendors from SEC 10-K filings, and review confidence-backed evidence before revenue attribution."
          icon={Compass}
          onClick={() => navigate("/scoping")}
        />
        <ChoiceCard
          title="Market model engine"
          subtitle="TAM / SAM modeling"
          description="Build and explore your market model on an interactive canvas with issue tree, formulas, and bottom-up sizing."
          icon={LineChart}
          onClick={() => navigate("/model")}
        />
      </div>
    </PageShell>
  );
}

function ChoiceCard({
  title,
  subtitle,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Compass;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left rounded-xl border bg-card p-6 shadow-sm transition-all",
        "hover:border-mds-blue hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-mds-blue",
      )}
    >
      <div className="h-11 w-11 rounded-lg bg-mds-blue/10 text-mds-blue grid place-items-center mb-4 group-hover:bg-mds-blue group-hover:text-white transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-mds-blue">{subtitle}</p>
      <h2 className="text-xl font-semibold text-mds-navy mt-1">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
      <span className="inline-block mt-4 text-sm font-medium text-mds-blue group-hover:underline">
        Get started →
      </span>
    </button>
  );
}
