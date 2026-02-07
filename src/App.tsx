import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { markUserInteracted } from "@/lib/sounds";
import { AppInit } from "./components/AppInit";
import WelcomeScreen from "./pages/WelcomeScreen";
import ProfileScreen from "./pages/ProfileScreen";
import RoomChoiceScreen from "./pages/RoomChoiceScreen";
import LobbyScreen from "./pages/LobbyScreen";
import MainGameScreen from "./pages/MainGameScreen";
import BankModeScreen from "./pages/BankModeScreen";
import PayRedirect from "./pages/PayRedirect";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  useEffect(() => {
    const onInteraction = () => {
      markUserInteracted();
      document.removeEventListener("click", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
    };
    document.addEventListener("click", onInteraction, { once: true });
    document.addEventListener("touchstart", onInteraction, { once: true });
    return () => {
      document.removeEventListener("click", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
    };
  }, []);

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppInit>
          <Routes>
            <Route path="/" element={<WelcomeScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/rooms" element={<RoomChoiceScreen />} />
            <Route path="/lobby" element={<LobbyScreen />} />
            <Route path="/game" element={<MainGameScreen />} />
            <Route path="/bank-mode" element={<BankModeScreen />} />
            <Route path="/pay" element={<PayRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppInit>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
