
import { useState, useEffect } from "react";
import { User, saveAuthLog, verifyUserSession, getStoredUser } from "@/utils/authUtils";

/**
 * Custom hook for managing authentication state
 * Handles loading state, user data, and error tracking
 */
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAuthLog, setLastAuthLog] = useState<string | null>(null);

  // Helper for logging with state updates
  const logAuthEvent = (message: string, data?: any) => {
    const logEntry = saveAuthLog(message, data);
    setLastAuthLog(logEntry);
    return logEntry;
  };

  // Restore auth state on initial load
  useEffect(() => {
    const restoreAuthState = async () => {
      try {
        logAuthEvent("Checking auth status");
        setLoading(true);
        
        // Check localStorage for stored user
        const storedUser = getStoredUser();
        
        if (storedUser) {
          // Pre-populate the user state while we verify the token
          setUser(storedUser);
          logAuthEvent("Restored user from localStorage", { username: storedUser.username });
          
          // Verify token validity
          const { isValid, userData } = await verifyUserSession(storedUser.access_token);
          
          if (isValid && userData) {
            logAuthEvent("Verified user session is valid", userData);
            // Update user data with latest from API
            const updatedUser = {
              ...storedUser,
              id: userData.id || storedUser.id,
              username: userData.username || storedUser.username,
              avatar_url: userData.profile_pic || storedUser.avatar_url,
              email: userData.email || storedUser.email
            };
            setUser(updatedUser);
            localStorage.setItem("kickstream_user", JSON.stringify(updatedUser));
          } else {
            logAuthEvent("Stored token appears invalid", "No user data returned");
            setUser(null);
          }
        } else {
          logAuthEvent("No user found in localStorage");
          setUser(null);
        }
      } catch (error: any) {
        logAuthEvent("Failed to restore auth state", error.message);
        setUser(null);
        setError("Failed to restore authentication state");
      } finally {
        setLoading(false);
      }
    };

    restoreAuthState();
  }, []);

  return {
    user,
    setUser,
    loading,
    setLoading,
    error,
    setError,
    lastAuthLog,
    logAuthEvent
  };
};
