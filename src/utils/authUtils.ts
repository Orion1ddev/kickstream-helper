// Auth utility functions for KickStream Helper
import { supabase } from "@/integrations/supabase/client";

export interface User {
  id: string;
  username: string;
  avatar_url?: string;
  access_token: string;
  refresh_token?: string;
  email?: string;
}

// Helper to clear all auth-related localStorage items
export const clearAuthStorage = () => {
  saveAuthLog("Clearing auth storage");
  localStorage.removeItem("kickstream_user");
  localStorage.removeItem("kickstream_oauth_state");
  localStorage.removeItem("kickstream_code_verifier");
};

// Helper to store auth logs for better debugging
export const saveAuthLog = (message: string, data?: any) => {
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

// Verifies a user session by testing the access token
export const verifyUserSession = async (accessToken: string) => {
  try {
    const { data: userData, error: userError } = await supabase.functions.invoke('kick-user', {
      body: { access_token: accessToken },
    });
    
    if (userError || !userData || userData.error) {
      return { isValid: false, userData: null, error: userError || userData?.error || "Invalid user data" };
    }
    
    return { isValid: true, userData, error: null };
  } catch (error: any) {
    return { isValid: false, userData: null, error: error.message };
  }
};

// Exchange auth code for tokens
export const exchangeCodeForToken = async (code: string, codeVerifier: string, redirectUri: string) => {
  try {
    const { data: tokenData, error: tokenError } = await supabase.functions.invoke('kick-auth', {
      body: { 
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri
      },
    });

    if (tokenError) {
      return { success: false, data: null, error: tokenError };
    }
    
    if (!tokenData || !tokenData.access_token) {
      return { success: false, data: null, error: "Failed to get access token from Kick" };
    }
    
    return { success: true, data: tokenData, error: null };
  } catch (error: any) {
    return { success: false, data: null, error: error.message };
  }
};

// Fetch user profile with access token
export const fetchUserProfile = async (accessToken: string) => {
  try {
    const { data: userData, error: userError } = await supabase.functions.invoke('kick-user', {
      body: { access_token: accessToken },
    });

    if (userError) {
      return { success: false, data: null, error: userError };
    }
    
    if (!userData || (!userData.id && !userData.generated_id)) {
      return { success: false, data: null, error: "Invalid user data returned from API" };
    }
    
    return { success: true, data: userData, error: null };
  } catch (error: any) {
    return { success: false, data: null, error: error.message };
  }
};

// Create user profile object from API response
export const createUserProfile = (userData: any, tokenData: any) => {
  return {
    id: userData.id?.toString() || userData.generated_id || `user-${Date.now()}`,
    username: userData.username || userData.name || `user-${Date.now().toString(36).substring(2, 7)}`,
    avatar_url: userData.profile_pic || userData.avatar || "https://static.kick.com/images/user/default-profile.png",
    email: userData.email,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  };
};
