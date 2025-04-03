
import React, { createContext, useState, useContext, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  User, 
  saveAuthLog, 
  clearAuthStorage, 
  verifyUserSession,
  exchangeCodeForToken,
  fetchUserProfile,
  createUserProfile 
} from "@/utils/authUtils";
import { 
  generateCodeVerifier, 
  buildKickAuthUrl 
} from "@/utils/pkceUtils";

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

// Helper function to update log state
const useAuthLogging = () => {
  const [lastAuthLog, setLastAuthLog] = useState<string | null>(null);

  const logAuthEvent = (message: string, data?: any) => {
    const logEntry = saveAuthLog(message, data);
    setLastAuthLog(logEntry);
    return logEntry;
  };

  return { lastAuthLog, logAuthEvent };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lastAuthLog, logAuthEvent } = useAuthLogging();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for stored session on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        logAuthEvent("Checking auth status");
        setLoading(true);
        
        // Always check localStorage first for faster initial load
        const storedUser = localStorage.getItem("kickstream_user");
        
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            // Pre-populate the user state while we verify the token
            setUser(parsedUser);
            logAuthEvent("Restored user from localStorage", { username: parsedUser.username });
            
            // Verify if the access token is still valid using test API call
            logAuthEvent("Verifying token validity");
            try {
              const { isValid, userData, error: verifyError } = await verifyUserSession(parsedUser.access_token);
              
              if (!isValid || verifyError) {
                logAuthEvent("Error verifying token", verifyError);
                // Clear the user session if token verification failed
                clearAuthStorage();
                setUser(null);
                return;
              }
              
              if (!userData) {
                logAuthEvent("Stored token appears invalid", "No user data returned");
                if (parsedUser.refresh_token) {
                  logAuthEvent("Token refresh needed - not yet implemented");
                  // Future: Implement token refresh
                  // For now, just log the user out
                  clearAuthStorage();
                  setUser(null);
                } else {
                  logAuthEvent("No refresh token available, user will need to login again");
                  clearAuthStorage();
                  setUser(null);
                }
              } else {
                logAuthEvent("Verified user session is valid", userData);
                // Update user data with latest from API
                const updatedUser = {
                  ...parsedUser,
                  id: userData.id || parsedUser.id,
                  username: userData.username || parsedUser.username,
                  avatar_url: userData.profile_pic || parsedUser.avatar_url,
                  email: userData.email || parsedUser.email
                };
                setUser(updatedUser);
                localStorage.setItem("kickstream_user", JSON.stringify(updatedUser));
              }
            } catch (verifyError: any) {
              logAuthEvent("Error verifying token", verifyError.message);
              // Token verification failed completely
              clearAuthStorage();
              setUser(null);
            }
          } catch (parseError) {
            logAuthEvent("Failed to parse stored user", parseError);
            clearAuthStorage();
            setUser(null);
          }
        } else {
          logAuthEvent("No user found in localStorage");
        }
      } catch (error: any) {
        logAuthEvent("Failed to restore auth state", error.message);
        clearAuthStorage();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Handle OAuth redirect
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      setLoading(true);
      setError(null);
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const errorParam = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");
      const state = urlParams.get("state");

      logAuthEvent("Processing URL params", { 
        code: code ? "present" : "not present", 
        error: errorParam, 
        errorDescription,
        state: state ? "present" : "not present"
      });

      // Clean URL after processing
      if (code || errorParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Handle OAuth error from Kick
      if (errorParam) {
        logAuthEvent("OAuth error from Kick", { errorParam, errorDescription });
        const errorMsg = errorDescription || "Failed to login with Kick. Please try again.";
        setError(errorMsg);
        toast({
          title: "Authentication Error",
          description: errorMsg,
          variant: "destructive",
        });
        clearAuthStorage();
        setLoading(false);
        return;
      }

      // Nothing to process if no code is present
      if (!code) {
        setLoading(false);
        return;
      }

      try {
        logAuthEvent("Authorization code received, exchanging for token");
        
        // Verify state parameter to prevent CSRF attacks
        const storedState = localStorage.getItem("kickstream_oauth_state");
        logAuthEvent("State verification", { storedState, receivedState: state });
        
        if (!storedState) {
          throw new Error("Authentication session expired. Please try again.");
        }
        
        if (state !== storedState) {
          logAuthEvent("OAuth state mismatch", { storedState, receivedState: state });
          throw new Error("Authentication failed due to security mismatch. Please try again.");
        }
        
        // Get code verifier for PKCE flow
        const codeVerifier = localStorage.getItem("kickstream_code_verifier");
        logAuthEvent("Code verifier retrieved", { present: !!codeVerifier });
        
        if (!codeVerifier) {
          throw new Error("Code verifier is missing. Please try logging in again.");
        }
        
        // Always use the same redirect URI that was used in the initial request
        const redirectUri = window.location.origin + "/login";
        logAuthEvent("Using redirect URI", { redirectUri });
        
        // Exchange code for token
        logAuthEvent("Calling kick-auth function to exchange code for token");
        const { success, data: tokenData, error: tokenError } = await exchangeCodeForToken(
          code, 
          codeVerifier, 
          redirectUri
        );

        // Clean up PKCE and state values
        localStorage.removeItem("kickstream_oauth_state");
        localStorage.removeItem("kickstream_code_verifier");

        if (!success || tokenError) {
          logAuthEvent("Token exchange error", tokenError);
          throw new Error(`Failed to exchange authorization code: ${tokenError?.message || "Unknown error"}`);
        }
        
        logAuthEvent("Token exchange response received", {
          success: !!tokenData?.access_token,
          tokenType: tokenData?.token_type
        });
        
        // Get user profile with the access token
        logAuthEvent("Fetching user profile with access token");
        const { success: profileSuccess, data: userData, error: userError } = await fetchUserProfile(tokenData.access_token);

        if (!profileSuccess || userError) {
          logAuthEvent("User profile fetch error", userError);
          throw new Error(`Failed to fetch user profile: ${userError?.message || "Unknown error"}`);
        }
        
        logAuthEvent("User profile response received", {
          hasId: !!userData?.id,
          hasUsername: !!userData?.username
        });
        
        // Create user profile from API response
        const userProfile = createUserProfile(userData, tokenData);
        
        logAuthEvent("Setting user profile", { username: userProfile.username });
        setUser(userProfile);
        localStorage.setItem("kickstream_user", JSON.stringify(userProfile));
        
        toast({
          title: "Login Successful",
          description: `Welcome, ${userProfile.username}!`,
        });
        
        // Navigate to dashboard
        const from = location.state?.from || "/dashboard";
        logAuthEvent("Redirecting after login", { destination: from });
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 100);
      } catch (error: any) {
        logAuthEvent("Login process error", error.message);
        setError(error.message || "Failed to complete login process. Please try again.");
        toast({
          title: "Authentication Error",
          description: error.message || "Failed to complete login process. Please try again.",
          variant: "destructive",
        });
        clearAuthStorage();
      } finally {
        setLoading(false);
      }
    };

    handleOAuthRedirect();
  }, [toast, navigate, location.state]);

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
