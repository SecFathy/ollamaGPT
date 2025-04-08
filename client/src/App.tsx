import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import ChatPage from "@/pages/chat";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import SetupPage from "@/pages/setup-page";
import AdminPage from "@/pages/admin-page";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

function Router() {
  const { data: setupStatus, isLoading } = useQuery({
    queryKey: ['/api/setup/status'],
    queryFn: async () => {
      const res = await fetch('/api/setup/status');
      if (!res.ok) throw new Error("Failed to check setup status");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If setup is not completed, show the setup page
  if (setupStatus && !setupStatus.isCompleted) {
    return (
      <Switch>
        <Route path="/" component={SetupPage} />
        <Route path="/setup" component={SetupPage} />
        <Route path="*">
          <Redirect to="/" />
        </Route>
      </Switch>
    );
  }

  // Normal routing after setup
  return (
    <Switch>
      <ProtectedRoute path="/" component={ChatPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize dark mode based on system preference
  useEffect(() => {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('darkMode');
    
    if (storedTheme !== null) {
      if (JSON.parse(storedTheme)) {
        document.documentElement.classList.add('dark');
      }
    } else if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
