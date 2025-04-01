
import React, { createContext, useState, useContext, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

// Helper to clear all auth-related localStorage items
const clearAuthStorage = () => {
  localStorage.removeItem("kickstream_user");
  localStorage.removeItem("kickstream_oauth_state");
  localStorage.removeItem("kickstream_code_verifier");
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Enhanced session check
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Always check localStorage first for faster initial load
        const storedUser = localStorage.getItem("kickstream_user");
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Pre-populate the user state while we verify the token
          setUser(parsedUser);
          console.log("Restored user from localStorage:", parsedUser.username);
          
          // Verify if the access token is still valid by making a test call
          // We'll do this silently in the background to avoid blocking the UI
          try {
            const { data: userData, error: userError } = await supabase.functions.invoke('kick-user', {
              body: { access_token: parsedUser.access_token },
            });
            
            if (userError || !userData) {
              console.log("Stored token may be invalid, will attempt refresh if available");
              if (parsedUser.refresh_token) {
                // TODO: Implement token refresh logic if needed in the future
                console.log("Token refresh would be implemented here");
              } else {
                // If no refresh token, session is truly invalid
                console.log("No refresh token available, user will need to login again");
                clearAuthStorage();
                setUser(null);
              }
            } else {
              console.log("Verified user session is valid");
              // Update user data with latest from API
              const updatedUser = {
                ...parsedUser,
                username: userData.username || parsedUser.username,
                avatar_url: userData.profile_pic || parsedUser.avatar_url,
                email: userData.email || parsedUser.email
              };
              setUser(updatedUser);
              localStorage.setItem("kickstream_user", JSON.stringify(updatedUser));
            }
          } catch (verifyError) {
            console.error("Error verifying token:", verifyError);
            // Keep the user logged in but make a note in the console
            // This way, if it's just a temporary API issue, we don't log them out
            console.log("Keeping user logged in despite verification error");
          }
        } else {
          console.log("No user found in localStorage");
        }
      } catch (error) {
        console.error("Failed to restore auth state:", error);
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

      console.log("URL params:", { 
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
        console.error("OAuth error:", errorParam, errorDescription);
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
        console.log("Authorization code received, exchanging for token...");
        
        // Get and validate state
        const storedState = localStorage.getItem("kickstream_oauth_state");
        
        if (!storedState) {
          console.error("No stored state found - session may have expired");
          throw new Error("Authentication session expired. Please try again.");
        }
        
        if (state !== storedState) {
          console.error("OAuth state mismatch: stored=" + storedState + ", received=" + state);
          throw new Error("Authentication failed due to security mismatch. Please try again.");
        }
        
        // Get code verifier from localStorage
        const codeVerifier = localStorage.getItem("kickstream_code_verifier");
        console.log("Code verifier retrieved:", codeVerifier ? "Yes" : "No");
        
        if (!codeVerifier) {
          throw new Error("Code verifier is missing. Please try logging in again.");
        }
        
        // Get the current redirect URI that we used
        const redirectUri = window.location.origin + "/login";
        
        // Exchange code for token using Supabase Edge Function
        console.log("Calling kick-auth function with code and verifier...");
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('kick-auth', {
          body: { 
            code,
            code_verifier: codeVerifier,
            redirect_uri: redirectUri
          },
        });

        // Clean up PKCE and state values
        clearAuthStorage();

        if (tokenError) {
          console.error("Token exchange error:", tokenError);
          throw new Error(`Failed to exchange authorization code: ${tokenError.message}`);
        }
        
        console.log("Token exchange response received");
        
        if (!tokenData || !tokenData.access_token) {
          console.error("Invalid token data:", tokenData);
          throw new Error("Failed to get access token from Kick");
        }
        
        // Get user profile with the access token
        console.log("Fetching user profile with access token...");
        const { data: userData, error: userError } = await supabase.functions.invoke('kick-user', {
          body: { access_token: tokenData.access_token },
        });

        if (userError) {
          console.error("User profile fetch error:", userError);
          throw new Error(`Failed to fetch user profile: ${userError.message}`);
        }
        
        console.log("User profile response received:", userData);
        
        if (!userData || !userData.id) {
          console.error("Invalid user data:", userData);
          throw new Error("Invalid user data returned from API");
        }
        
        const userProfile = {
          id: userData.id.toString(),
          username: userData.username,
          avatar_url: userData.profile_pic,
          email: userData.email,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
        };
        
        setUser(userProfile);
        localStorage.setItem("kickstream_user", JSON.stringify(userProfile));
        
        toast({
          title: "Login Successful",
          description: `Welcome, ${userProfile.username}!`,
        });
      } catch (error: any) {
        console.error("Failed to complete authentication:", error);
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
  }, [toast]);

  const login = async () => {
    try {
      setError(null);
      
      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await sha256(codeVerifier).then(base64urlencode);
      
      // Generate random state
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store code verifier and state in localStorage for later verification
      localStorage.setItem("kickstream_code_verifier", codeVerifier);
      localStorage.setItem("kickstream_oauth_state", state);
      
      // Redirect to Kick's OAuth endpoint with PKCE
      const CLIENT_ID = "01JQMD5PMFX0MFYPMT9A7YDHGC";
      const REDIRECT_URI = window.location.origin + "/login";
      const SCOPES = "user:read channel:read events:read events:subscribe";
      
      console.log("Initiating login redirect to Kick OAuth...");
      console.log("Using client ID:", CLIENT_ID);
      console.log("Using redirect URI:", REDIRECT_URI);
      console.log("Code challenge generated:", codeChallenge ? "Yes" : "No");
      console.log("State value generated:", state);
      
      const authUrl = new URL("https://id.kick.com/oauth/authorize");
      authUrl.searchParams.append("client_id", CLIENT_ID);
      authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("scope", SCOPES);
      authUrl.searchParams.append("code_challenge", codeChallenge);
      authUrl.searchParams.append("code_challenge_method", "S256");
      authUrl.searchParams.append("state", state);
      
      console.log("Authorization URL:", authUrl.toString());
      window.location.href = authUrl.toString();
    } catch (error: any) {
      console.error("Error initiating login:", error);
      setError(error.message || "Failed to start the login process. Please try again.");
      toast({
        title: "Login Error",
        description: "Failed to start the login process. Please try again.",
        variant: "destructive",
      });
    }
  };

  const logout = () => {
    setUser(null);
    clearAuthStorage();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
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
