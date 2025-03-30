
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-kick animate-pulse-green"></div>
            <span className="font-bold text-xl hidden sm:inline-block">KickStream Helper</span>
          </Link>
        </div>

        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              {user?.avatar_url && (
                <div className="relative h-8 w-8 rounded-full overflow-hidden border-2 border-kick">
                  <img 
                    src={user.avatar_url} 
                    alt={user.username} 
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <span className="font-medium hidden md:block">{user?.username}</span>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Log out</span>
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button>Login with Kick</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
