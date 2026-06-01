@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* MDS Brand */
    --mds-blue: 227 100% 57%;
    --mds-blue-hover: 227 77% 45%;
    --mds-blue-light: 199 100% 48%;
    --mds-navy: 207 75% 10%;
    --mds-danger: 350 100% 45%;
    --mds-success: 147 100% 33%;
    --mds-warning: 43 100% 50%;
    --mds-info: 227 100% 57%;
    --mds-neutral: 220 9% 46%;

    /* Surfaces */
    --background: 0 0% 100%;
    --foreground: 207 75% 10%;
    --surface-muted: 210 20% 98%;
    --surface-subtle: 210 16% 96%;

    --card: 0 0% 100%;
    --card-foreground: 207 75% 10%;

    --popover: 0 0% 100%;
    --popover-foreground: 207 75% 10%;

    --primary: 227 100% 57%;
    --primary-foreground: 0 0% 100%;

    --secondary: 210 16% 96%;
    --secondary-foreground: 207 75% 10%;

    --muted: 210 16% 96%;
    --muted-foreground: 220 9% 46%;

    --accent: 199 100% 48%;
    --accent-foreground: 0 0% 100%;

    --destructive: 350 100% 45%;
    --destructive-foreground: 0 0% 100%;

    --border: 214 20% 88%;
    --input: 214 20% 88%;
    --ring: 227 100% 57%;

    --radius: 0.375rem;

    --sidebar-background: 207 75% 10%;
    --sidebar-foreground: 210 20% 92%;
    --sidebar-primary: 227 100% 57%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 207 55% 16%;
    --sidebar-accent-foreground: 0 0% 100%;
    --sidebar-border: 207 55% 18%;
    --sidebar-ring: 227 100% 57%;
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground antialiased;
    font-family: "McKinsey Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-feature-settings: "cv02", "cv03";
  }
  h1, h2, h3, h4 { @apply tracking-tight; }
}

@layer components {
  .mds-kpi {
    @apply rounded-md border bg-card p-5 shadow-sm;
  }
  .mds-eyebrow {
    @apply text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground;
  }
  .mds-grid-bg {
    background-image: linear-gradient(to right, hsl(var(--border) / 0.4) 1px, transparent 1px),
                      linear-gradient(to bottom, hsl(var(--border) / 0.4) 1px, transparent 1px);
    background-size: 24px 24px;
  }
}
