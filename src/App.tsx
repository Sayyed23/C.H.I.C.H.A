
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Home from "./pages/Home";
import AuthPage from "./pages/Auth";
import { useToast } from "./hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Session check error:', error);
        setIsAuthenticated(false);
      }
    };

    checkSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        queryClient.clear(); // Clear React Query cache
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setIsAuthenticated(!!session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [toast, queryClient]);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <div className="flex w-full">
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route
                  path="/home"
                  element={isAuthenticated ? <Home /> : <Navigate to="/auth" />}
                />
                <Route
                  path="/chat"
                  element={isAuthenticated ? <Index /> : <Navigate to="/auth" />}
                />
                <Route
                  path="/"
                  element={isAuthenticated ? <Home /> : <Navigate to="/auth" />}
                />
                <Route
                  path="/auth"
                  element={!isAuthenticated ? <AuthPage /> : <Navigate to="/" />}
                />
              </Routes>
            </BrowserRouter>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;