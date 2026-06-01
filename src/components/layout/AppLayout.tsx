import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AICopilot from "./AICopilot";

export default function AppLayout() {
  return (
    <div className="flex h-screen w-full bg-surface-muted">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="flex-1 flex min-h-0">
          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-auto">
            <Outlet />
          </main>
          <AICopilot />
        </div>
      </div>
    </div>
  );
}
