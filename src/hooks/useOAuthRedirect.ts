
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  clearAuthStorage, 
  exchangeCodeForToken,
  fetchUserProfile,
  createUserProfile,
  saveUserToStorage
} from "@/utils/authUtils";

interface UseOAuthRedirectProps {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUser: (user: any) => void;
  logAuthEvent: (message: string, data?: any) => string;
}

/**
 * Hook for handling OAuth redirects from Kick.com
 * Processes authorization codes and errors
 */
export const useOAuthRedirect = ({
  setLoading,
  setError,
  setUser,
  logAuthEvent
}: UseOAuthRedirectProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleOAuthRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const errorParam = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");
      const state = urlParams.get("state");

      // Clean URL after processing
      if (code || errorParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Nothing to process if no code or error
      if (!code && !errorParam) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      logAuthEvent("Processing URL params", { 
        code: code ? "present" : "not present", 
        error: errorParam, 
        errorDescription,
        state: state ? "present" : "not present"
      });

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

      if (!code) {
        setLoading(false);
        return;
      }

      try {
        logAuthEvent("Authorization code received, processing authentication");
        
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
        
        // Use the same redirect URI that was used in the initial request
        const redirectUri = window.location.origin + "/login";
        
        // Exchange code for token
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
        
        // Get user profile with the access token
        const { success: profileSuccess, data: userData, error: userError } = await fetchUserProfile(tokenData.access_token);

        if (!profileSuccess || userError) {
          logAuthEvent("User profile fetch error", userError);
          throw new Error(`Failed to fetch user profile: ${userError?.message || "Unknown error"}`);
        }
        
        // Create user profile from API response
        const userProfile = createUserProfile(userData, tokenData);
        
        logAuthEvent("Setting user profile", { username: userProfile.username });
        setUser(userProfile);
        saveUserToStorage(userProfile);
        
        toast({
          title: "Login Successful",
          description: `Welcome, ${userProfile.username}!`,
        });
        
        // Navigate to dashboard or requested page
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
  }, [location, navigate, toast, setLoading, setError, setUser, logAuthEvent]);
};
