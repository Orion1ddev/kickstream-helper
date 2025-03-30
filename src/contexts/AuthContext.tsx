
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check if user is logged in when app loads
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const storedUser = localStorage.getItem("kickstream_user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log("Restored user from localStorage:", parsedUser.username);
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
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");
      const state = urlParams.get("state");

      console.log("URL params:", { 
        code: code ? "present" : "not present", 
        error, 
        errorDescription,
        state
      });

      // Validate state if present
      const storedState = localStorage.getItem("kickstream_oauth_state");
      if (state && storedState && state !== storedState) {
        console.error("OAuth state mismatch, possible CSRF attack");
        toast({
          title: "Security Error",
          description: "Authentication failed due to security mismatch. Please try again.",
          variant: "destructive",
        });
        localStorage.removeItem("kickstream_oauth_state");
        localStorage.removeItem("kickstream_code_verifier");
        setLoading(false);
        return;
      }

      // Clean URL after processing
      if (code || error) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (error) {
        console.error("OAuth error:", error, errorDescription);
        toast({
          title: "Authentication Error",
          description: errorDescription || "Failed to login with Kick. Please try again.",
          variant: "destructive",
        });
        localStorage.removeItem("kickstream_oauth_state");
        localStorage.removeItem("kickstream_code_verifier");
        setLoading(false);
        return;
      }

      if (code) {
        setLoading(true);
        try {
          console.log("Exchanging code for token...");
          
          // Get code verifier from localStorage
          const codeVerifier = localStorage.getItem("kickstream_code_verifier");
          console.log("Code verifier retrieved:", codeVerifier ? "Yes" : "No");
          
          // Exchange code for token using Supabase Edge Function
          const { data, error } = await supabase.functions.invoke('kick-auth', {
            body: { 
              code,
              code_verifier: codeVerifier 
            },
          });

          // Clean up PKCE and state values
          localStorage.removeItem("kickstream_oauth_state");
          localStorage.removeItem("kickstream_code_verifier");

          if (error) {
            console.error("Token exchange error:", error);
            throw error;
          }
          
          console.log("Token exchange response:", data);
          
          if (data && data.access_token) {
            // Get user profile with the access token
            console.log("Fetching user profile...");
            const { data: userData, error: userError } = await supabase.functions.invoke('kick-user', {
              body: { access_token: data.access_token },
            });

            if (userError) {
              console.error("User profile fetch error:", userError);
              throw userError;
            }
            
            console.log("User profile response:", userData);
            
            if (!userData || !userData.id) {
              throw new Error("Invalid user data returned from API");
            }
            
            const userProfile = {
              id: userData.id.toString(),
              username: userData.username,
              avatar_url: userData.profile_pic,
              email: userData.email,
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            };
            
            setUser(userProfile);
            localStorage.setItem("kickstream_user", JSON.stringify(userProfile));
            
            toast({
              title: "Login Successful",
              description: "You are now logged in with Kick.",
            });
          } else {
            console.error("No access token in response");
            throw new Error("Failed to get access token");
          }
        } catch (error) {
          console.error("Failed to exchange code for token:", error);
          toast({
            title: "Authentication Error",
            description: "Failed to complete login process. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    handleOAuthRedirect();
  }, [toast]);

  const login = async () => {
    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await sha256(codeVerifier).then(base64urlencode);
      
      // Generate random state
      const state = Math.random().toString(36).substring(2, 15);
      
      // Store code verifier and state in localStorage for later verification
      localStorage.setItem("kickstream_code_verifier", codeVerifier);
      localStorage.setItem("kickstream_oauth_state", state);
      
      // Redirect to Kick's OAuth endpoint with PKCE
      const CLIENT_ID = "01JQMD5PMFX0MFYPMT9A7YDHGC";
      const REDIRECT_URI = "https://preview--kickstream-helper.lovable.app/login";
      const SCOPES = "user:read channel:read events:read";
      
      console.log("Initiating login redirect to Kick OAuth...");
      console.log("Using client ID:", CLIENT_ID);
      console.log("Using redirect URI:", REDIRECT_URI);
      console.log("Code challenge generated:", codeChallenge ? "Yes" : "No");
      console.log("State value generated:", state);
      
      const authUrl = new URL("https://id.kick.com/oauth/authorize");
      authUrl.searchParams.append("client_id", CLIENT_ID);
      authUrl.searchParams.append("redirect_uri", encodeURIComponent(REDIRECT_URI));
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("scope", encodeURIComponent(SCOPES));
      authUrl.searchParams.append("code_challenge", codeChallenge);
      authUrl.searchParams.append("code_challenge_method", "S256");
      authUrl.searchParams.append("state", state);
      
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error("Error initiating login:", error);
      toast({
        title: "Login Error",
        description: "Failed to start the login process. Please try again.",
        variant: "destructive",
      });
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("kickstream_user");
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
