
import React, { createContext, useState, useContext, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

interface User {
  id: string;
  username: string;
  avatar_url?: string;
  access_token: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

      // Clean URL after processing
      if (code || error) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (error) {
        toast({
          title: "Authentication Error",
          description: "Failed to login with Kick. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (code) {
        setLoading(true);
        try {
          // In a real implementation, we would exchange the code for an access token
          // For now, we'll just simulate a successful login
          const mockUser = {
            id: "mock-user-id",
            username: "kickuser",
            avatar_url: "https://via.placeholder.com/150",
            access_token: "mock-access-token",
          };
          
          setUser(mockUser);
          localStorage.setItem("kickstream_user", JSON.stringify(mockUser));
          
          toast({
            title: "Login Successful",
            description: "You are now logged in with Kick.",
          });
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

  const login = () => {
    // In a real implementation, we would redirect to Kick's OAuth endpoint
    // For demo purposes, we'll simulate the OAuth flow
    // This would be replaced with actual Kick OAuth URL
    
    // Normally, this would be something like:
    // window.location.href = `https://kick.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=user:read`;
    
    // For now, let's simulate with a mock URL that redirects back to our app with a code
    window.location.href = `${window.location.origin}?code=mock_auth_code`;
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
