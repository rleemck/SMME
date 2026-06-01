import { Badge } from "@/components/ui/badge";
import type { SecRetrievalStatus } from "@/types/sec";
import { SEC_STATUS_LABELS } from "@/types/sec";

const VARIANT: Record<SecRetrievalStatus, "default" | "secondary" | "outline" | "destructive"> = {
  live: "default",
  fallback_10q: "secondary",
  unavailable: "outline",
  error: "destructive",
};

type Props = {
  status?: SecRetrievalStatus;
  retrievedAt?: string;
  compact?: boolean;
};

export function SecStatusBadge({ status, retrievedAt, compact }: Props) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="space-y-0.5">
      <Badge
        variant={VARIANT[status]}
        className="text-[10px] font-normal whitespace-normal text-left leading-snug h-auto py-1 px-2 max-w-full"
      >
        {SEC_STATUS_LABELS[status]}
      </Badge>
      {!compact && retrievedAt && (
        <div className="text-[10px] text-muted-foreground">
          Retrieved {new Date(retrievedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
