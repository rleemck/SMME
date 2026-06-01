import { useState } from "react";

type Props = {
  text: string;
  maxChars?: number;
};

export function TextExpandable({ text, maxChars = 280 }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span className="text-xs text-muted-foreground">—</span>;
  const needsMore = text.length > maxChars;

  return (
    <div>
      <p className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words leading-snug">
        {expanded || !needsMore ? text : `${text.slice(0, maxChars)}…`}
      </p>
      {needsMore && (
        <button
          type="button"
          className="text-[11px] font-medium text-mds-blue hover:underline mt-1"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
