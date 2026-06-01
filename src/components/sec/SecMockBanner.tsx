import { useMockSec } from "@/services/secClient";

export function SecMockBanner() {
  if (!useMockSec()) return null;
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-50 text-amber-950 px-4 py-3 text-sm">
      Mock SEC data is enabled. Results are not based on live SEC filings.
    </div>
  );
}
