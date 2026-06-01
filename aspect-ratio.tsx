import { NavLink } from "react-router-dom";
import { Home, Compass, Database, LineChart, LayoutTemplate, Download, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/scoping", label: "Software Scoping Expert", icon: Compass },
  { to: "/revenue", label: "Revenue Mapping", icon: Database },
  { to: "/model", label: "Market Model Engine", icon: LineChart },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/exports", label: "Exports", icon: Download },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-mds-blue grid place-items-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">Market Model</div>
          <div className="text-[11px] text-sidebar-foreground/60 leading-tight">Software Engine</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border text-[11px] text-sidebar-foreground/55">
        v0.1 · Prototype · Internal Use Only
      </div>
    </aside>
  );
}
