import React, { createContext, useState, useContext, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

interface User {
  id: string;
  username: string;
  avatar_url?: string;
  access_token: string;
  refresh_token?: string;
  email?: string;
}

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

// Helper to store auth logs for better debugging
const saveAuthLog = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${message}${data ? `: ${JSON.stringify(data)}` : ''}`;
  console.log(logEntry);
  
  // Store recent logs in localStorage for debugging
  const existingLogs = localStorage.getItem("kickstream_auth_logs") || "[]";
  const logs = JSON.parse(existingLogs);
  logs.push(logEntry);
  
  // Keep only the most recent 20 logs
  while (logs.length > 20) {
    logs.shift();
  }
  
  localStorage.setItem("kickstream_auth_logs", JSON.stringify(logs));
  return logEntry;
};

// Helper to clear all auth-related localStorage items
const clearAuthStorage = () => {
  saveAuthLog("Clearing auth storage");
  localStorage.removeItem("kickstream_user");
  localStorage.removeItem("kickstream_oauth_state");
  localStorage.removeItem("kickstream_code_verifier");
};

// PKCE utilities
const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
};

const base64urlencode = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAuthLog, setLastAuthLog] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Add a helper function to update log state
  const logAuthEvent = (message: string, data?: any) => {
    const logEntry = saveAuthLog(message, data);
    setLastAuthLog(logEntry);
    return logEntry;
  };

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
              const { data: userData, error: userError } = await supabase.functions.invoke('kick-user', {
                body: { access_token: parsedUser.access_token },
              });
              
              if (userError) {
                logAuthEvent("Error verifying token", userError);
                // Clear the user session if token verification failed
                clearAuthStorage();
                setUser(null);
                return;
              }
              
              if (!userData || userData.error) {
                logAuthEvent("Stored token appears invalid", userData?.error || "No user data returned");
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
        
        // Exchange code for token using Supabase Edge Function
        logAuthEvent("Calling kick-auth function to exchange code for token");
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('kick-auth', {
          body: { 
            code,
            code_verifier: codeVerifier,
            redirect_uri: redirectUri
          },
        });

        // Clean up PKCE and state values
        localStorage.removeItem("kickstream_oauth_state");
        localStorage.removeItem("kickstream_code_verifier");

        if (tokenError) {
          logAuthEvent("Token exchange error", tokenError);
          throw new Error(`Failed to exchange authorization code: ${tokenError.message}`);
        }
        
        logAuthEvent("Token exchange response received", {
          success: !!tokenData?.access_token,
          tokenType: tokenData?.token_type
        });
        
        if (!tokenData || !tokenData.access_token) {
          logAuthEvent("Invalid token data", tokenData);
          throw new Error("Failed to get access token from Kick");
        }
        
        // Get user profile with the access token
        logAuthEvent("Fetching user profile with access token");
        const { data: userData, error: userError } = await supabase.functions.invoke('kick-user', {
          body: { access_token: tokenData.access_token },
        });

        if (userError) {
          logAuthEvent("User profile fetch error", userError);
          throw new Error(`Failed to fetch user profile: ${userError.message}`);
        }
        
        logAuthEvent("User profile response received", {
          hasId: !!userData?.id,
          hasUsername: !!userData?.username
        });
        
        if (!userData || (!userData.id && !userData.generated_id)) {
          logAuthEvent("Invalid user data", userData);
          throw new Error("Invalid user data returned from API");
        }
        
        const userProfile = {
          id: userData.id?.toString() || userData.generated_id || `user-${Date.now()}`,
          username: userData.username || userData.name || `user-${Date.now().toString(36).substring(2, 7)}`,
          avatar_url: userData.profile_pic || userData.avatar || "https://static.kick.com/images/user/default-profile.png",
          email: userData.email,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
        };
        
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
      
      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await sha256(codeVerifier).then(base64urlencode);
      
      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store code verifier and state in localStorage for later verification
      localStorage.setItem("kickstream_code_verifier", codeVerifier);
      localStorage.setItem("kickstream_oauth_state", state);
      
      // Set up Kick OAuth parameters
      const CLIENT_ID = "01JQMD5PMFX0MFYPMT9A7YDHGC";
      const REDIRECT_URI = window.location.origin + "/login";
      const SCOPES = "user:read channel:read events:read events:subscribe";
      
      logAuthEvent("OAuth parameters", {
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_challenge_generated: !!codeChallenge,
        state
      });
      
      // Build the authorization URL with PKCE parameters
      const authUrl = new URL("https://id.kick.com/oauth/authorize");
      authUrl.searchParams.append("client_id", CLIENT_ID);
      authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("scope", SCOPES);
      authUrl.searchParams.append("code_challenge", codeChallenge);
      authUrl.searchParams.append("code_challenge_method", "S256");
      authUrl.searchParams.append("state", state);
      
      logAuthEvent("Redirecting to Kick authorization URL", { url: authUrl.toString() });
      window.location.href = authUrl.toString();
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
