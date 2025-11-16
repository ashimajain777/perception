// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import Popup from "./pages/Popup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Initialize state to null to show a loading state
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    // Use chrome.storage.local.get to read the value
    // This is asynchronous
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["onboardingComplete"], (result) => {
        // Check the value from the result object
        const complete = result.onboardingComplete === true;
        setOnboardingComplete(complete);
      });
    } else {
      // Fallback for when not in extension (e.g., local dev)
      // This will default to showing the onboarding page.
      console.warn("chrome.storage.local not available.");
      setOnboardingComplete(false);
    }
  }, []);

  // Show nothing (or a loading spinner) while checking the storage
  if (onboardingComplete === null) {
    return null; // Loading state
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route
              path="/"
              element={
                // This logic will now work correctly
                onboardingComplete ? <Index /> : <Navigate to="/onboarding" replace />
              }
            />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/popup" element={<Popup />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
