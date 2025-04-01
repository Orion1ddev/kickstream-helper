
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useSearchParams, useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertCircle, Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Helper to format auth logs for display
const formatAuthLogs = (logs: string[]): string => {
  return logs.join('\n\n');
};

const Login = () => {
  const { login, isAuthenticated, loading, error, lastAuthLog } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [searchParams] = useSearchParams();
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [authLogs, setAuthLogs] = useState<string[]>([]);
  const { toast } = useToast();
  const location = useLocation();
  
  // Check for auth logs in localStorage
  useEffect(() => {
    try {
      const storedLogs = localStorage.getItem("kickstream_auth_logs");
      if (storedLogs) {
        setAuthLogs(JSON.parse(storedLogs));
      }
    } catch (e) {
      console.error("Error loading auth logs:", e);
    }
  }, [lastAuthLog]); // Refresh when lastAuthLog changes
  
  // Check for auth errors in URL parameters
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    
    if (errorParam) {
      toast({
        title: "Authentication Error",
        description: errorDescription || "Failed to login with Kick. Please try again.",
        variant: "destructive",
      });
      
      // Clean URL after processing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams, toast]);

  const handleLogin = () => {
    setIsLoggingIn(true);
    login();
  };

  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-16 w-16 text-kick animate-spin" />
          <p className="text-muted-foreground text-lg">Checking login status...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    const from = location.state?.from || "/dashboard";
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-4 bg-gradient-to-b from-background to-background/90">
        <Card className="w-full max-w-md border border-border/40 shadow-lg backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-kick animate-pulse-green mr-3"></div>
              <CardTitle className="text-2xl font-bold">KickStream Helper</CardTitle>
            </div>
            <CardDescription className="text-center text-base">
              Connect your Kick.com account to access streaming tools and analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {error && (
              <Alert variant="destructive" className="animate-fadeIn">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 gap-4">
              <Button 
                onClick={handleLogin} 
                className="w-full h-12 text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                variant="kick"
                size="xl"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-6 w-6 mr-2"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
                        fill="currentColor"
                      />
                      <path d="M15 8L8 12L15 16V8Z" fill="currentColor" />
                    </svg>
                    Login with Kick
                  </>
                )}
              </Button>

              <Button 
                onClick={toggleDebugInfo} 
                variant="outline" 
                className="text-xs h-8"
                type="button"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                {showDebugInfo ? "Hide Debug Info" : "Show Debug Info"}
              </Button>
            </div>
            
            {showDebugInfo && authLogs.length > 0 && (
              <Alert className="bg-muted/70 border border-border/50 overflow-auto max-h-60">
                <AlertTitle className="text-xs font-mono">Authentication Logs</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap text-xs font-mono mt-2">
                  {formatAuthLogs(authLogs)}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Secure Login</span>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-4">
              <Alert className="bg-muted/50 border border-border/30">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  You will be redirected to Kick.com to authorize this application. Your login session will be remembered for future visits.
                </AlertDescription>
              </Alert>
              
              <p className="text-center text-xs">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Login;
