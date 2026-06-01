import { useState } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModel, fmtUsdB } from "@/store/ModelStore";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "Explain the model",
  "Recommend assumptions",
  "Suggest vendors",
  "Identify missing segments",
  "Explain the formulas",
  "Generate executive summary",
];

export default function AICopilot() {
  const { copilotOpen, setCopilotOpen, tam, vendors, assumptions } = useModel();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi — I can explain the model, recommend assumptions, or suggest vendors. Ask me anything." },
  ]);
  const [input, setInput] = useState("");

  const respond = (q: string) => {
    const lower = q.toLowerCase();
    let reply = "I'll incorporate that. (Mock response — connect Platform McKinsey AI Gateway to enable live reasoning.)";
    if (lower.includes("explain") && lower.includes("model")) {
      reply = `TAM = Σ vendor revenue / Penetration × (1 + Growth) × Expansion. Current TAM is ${fmtUsdB(tam)} across ${vendors.filter(v => v.status === "Included").length} included vendors.`;
    } else if (lower.includes("recommend") || lower.includes("assumption")) {
      reply = "Growth Rate (14%) is within Gartner's 12–16% range. Consider lowering Expansion Factor to 1.10 to stay conservative on adjacency.";
    } else if (lower.includes("vendor")) {
      reply = "Consider adding: Wiz, Cloudflare, Check Point. These have material cloud security revenue not currently captured.";
    } else if (lower.includes("segment")) {
      reply = "Missing segments: Data Security (e.g., Rubrik), Email Security (e.g., Proofpoint), API Security (e.g., Akamai).";
    } else if (lower.includes("formula")) {
      reply = "Vendor Revenue × Penetration⁻¹ scales bottom-up coverage to full market; Growth projects forward; Expansion captures adjacent share.";
    } else if (lower.includes("summary")) {
      reply = `Cloud Security TAM is ${fmtUsdB(tam)}, growing at ${assumptions.find(a => a.name === "Growth Rate")?.value}% with ${vendors.length} mapped vendors. Endpoint and Cloud Security dominate share.`;
    }
    setMessages((m) => [...m, { role: "user", text: q }, { role: "ai", text: reply }]);
  };

  const send = () => {
    if (!input.trim()) return;
    respond(input.trim());
    setInput("");
  };

  return (
    <aside
      className={cn(
        "shrink-0 border-l bg-card flex flex-col transition-all duration-200 overflow-hidden",
        copilotOpen ? "w-[360px]" : "w-0"
      )}
    >
      {copilotOpen && (
        <>
          <div className="h-14 flex items-center justify-between px-4 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-mds-blue" />
              <span className="font-semibold text-sm">AI Copilot</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCopilotOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-4 py-3 border-b">
            <div className="mds-eyebrow mb-2">Quick prompts</div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => respond(s)}
                  className="text-[11px] px-2 py-1 rounded border bg-surface-muted hover:bg-secondary transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("text-sm rounded-md p-3 max-w-[92%]", m.role === "ai" ? "bg-surface-muted border" : "bg-mds-blue text-white ml-auto")}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="border-t p-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask the Copilot…"
              className="h-9"
            />
            <Button size="icon" onClick={send} className="h-9 w-9">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
