import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Constrain width for form-style pages (e.g. Market Definition) */
  narrow?: boolean;
};

/** Consistent full-width desktop page padding; avoids clipping in flex layouts. */
export function PageShell({ children, className, narrow }: Props) {
  return (
    <div
      className={cn(
        "page-shell animate-fade-in w-full min-w-0",
        narrow && "max-w-6xl mx-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}
