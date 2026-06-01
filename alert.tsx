import { Button } from "@/components/ui/button";
import { Save, Download, Sparkles, ChevronDown } from "lucide-react";
import { useModel } from "@/store/ModelStore";

export default function Header() {
  const { market, setCopilotOpen, copilotOpen } = useModel();
  return (
    <header className="h-14 shrink-0 border-b bg-card flex items-center px-6 gap-4">
      <div className="flex items-baseline gap-3 min-w-0">
        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Market</div>
        <div className="text-sm font-semibold text-mds-navy truncate">{market.name}</div>
        <span className="text-muted-foreground">·</span>
        <div className="text-sm text-muted-foreground">{market.geography}</div>
        <span className="text-muted-foreground">·</span>
        <div className="text-sm text-muted-foreground">{market.timeframe}</div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant={copilotOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setCopilotOpen(!copilotOpen)}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" /> AI Copilot
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Save className="h-4 w-4" /> Save
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Export
        </Button>
        <div className="ml-2 flex items-center gap-2 pl-3 border-l">
          <div className="h-8 w-8 rounded-full bg-mds-navy text-white text-xs grid place-items-center font-semibold">MK</div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
