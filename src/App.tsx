import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ModelProvider } from "@/store/ModelStore";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import ScopingExpert from "./pages/ScopingExpert";
import RevenueMapping from "./pages/RevenueMapping";
import ModelEngine from "./pages/ModelEngine";
import Templates from "./pages/Templates";
import Exports from "./pages/Exports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ModelProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/scoping" element={<ScopingExpert />} />
              <Route path="/revenue" element={<RevenueMapping />} />
              <Route path="/model" element={<ModelEngine />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/exports" element={<Exports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ModelProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
