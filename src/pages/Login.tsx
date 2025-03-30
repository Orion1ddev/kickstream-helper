
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const { login, isAuthenticated, loading, error } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-16 w-16 rounded-full bg-kick/20 animate-pulse-green"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Login to KickStream Helper</CardTitle>
            <CardDescription>
              Connect your Kick.com account to access streaming tools and analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 gap-4">
              <Button 
                onClick={handleLogin} 
                className="w-full bg-kick hover:bg-kick/90 text-black"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <span className="mr-2 h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-5 w-5"
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
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Secure Login</span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-2">
              <p className="text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  You will be redirected to Kick.com to authorize this application.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Login;
