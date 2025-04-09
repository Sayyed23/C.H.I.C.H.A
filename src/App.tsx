import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Home from "./pages/Home";
import AuthPage from "./pages/Auth";
import TodoPage from "./pages/Todo";
import ChildhoodMemoryPage from "./pages/ChildhoodMemory";
import { SidebarProvider } from "@/components/ui/sidebar";
import { handleAuthCallback } from "./integrations/auth/googleAuth";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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
  }, [queryClient]);

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
            <SonnerToaster />
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
                <Route
                  path="/auth/callback"
                  element={<AuthCallbackHandler />}
                />
                <Route
                  path="/todo/:id"
                  element={isAuthenticated ? <TodoPage /> : <Navigate to="/auth" />}
                />
                <Route
                  path="/childhood-memory"
                  element={isAuthenticated ? <ChildhoodMemoryPage /> : <Navigate to="/auth" />}
                />
              </Routes>
            </BrowserRouter>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

// Handle OAuth callbacks
const AuthCallbackHandler = () => {
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const processCallback = async () => {
      try {
        const session = await handleAuthCallback();
        if (!session) {
          throw new Error("Failed to complete authentication");
        }
        
        // Redirect to the home page after successful authentication
        window.location.href = '/';
      } catch (error) {
        console.error('Error handling auth callback:', error);
        setError((error as Error).message);
      }
    };
    
    processCallback();
  }, []);
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <h1 className="text-xl font-bold mb-4">Authentication Error</h1>
        <p className="text-red-500">{error}</p>
        <a href="/auth" className="mt-4 underline">
          Back to login
        </a>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="ml-2">Completing authentication...</p>
    </div>
  );
};

export default App;
