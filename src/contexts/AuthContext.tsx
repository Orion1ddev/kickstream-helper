
import React, { createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { User, clearAuthStorage, saveAuthLog } from "@/utils/authUtils";
import { generateCodeVerifier, buildKickAuthUrl } from "@/utils/pkceUtils";
import { useAuthState } from "@/hooks/useAuthState";
import { useOAuthRedirect } from "@/hooks/useOAuthRedirect";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  error: string | null;
  lastAuthLog: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use our custom hooks for state management
  const { 
    user, 
    setUser, 
    loading, 
    setLoading, 
    error, 
    setError, 
    lastAuthLog, 
    logAuthEvent 
  } = useAuthState();
  
  // Handle OAuth redirects
  useOAuthRedirect({ setLoading, setError, setUser, logAuthEvent });

  const login = async () => {
    try {
      setError(null);
      logAuthEvent("Starting Kick OAuth login flow");
      
      // Generate PKCE code verifier and random state for CSRF protection
      const codeVerifier = generateCodeVerifier();
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store code verifier and state in localStorage for later verification
      localStorage.setItem("kickstream_code_verifier", codeVerifier);
      localStorage.setItem("kickstream_oauth_state", state);
      
      // Build the Kick authorization URL
      const authUrl = await buildKickAuthUrl(codeVerifier, state);
      
      logAuthEvent("Redirecting to Kick authorization URL", { url: authUrl });
      window.location.href = authUrl;
    } catch (error: any) {
      logAuthEvent("Error initiating login", error);
      setError(error.message || "Failed to start the login process. Please try again.");
      toast({
        title: "Login Error",
        description: "Failed to start the login process. Please try again.",
        variant: "destructive",
      });
    }
  };

  const logout = () => {
    logAuthEvent("User logging out");
    setUser(null);
    clearAuthStorage();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        error,
        lastAuthLog
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
