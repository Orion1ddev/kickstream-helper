
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Link as LinkIcon, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
            <div className="h-8 w-8 rounded-full bg-kick animate-pulse-green"></div>
            <span className="font-bold text-xl hidden sm:inline-block">KickStream Helper</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link to="/link-sorter">
                <Button variant="ghost" className="flex items-center gap-1">
                  <LinkIcon className="h-4 w-4" />
                  <span>Link Sorter</span>
                </Button>
              </Link>
              
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-card border border-border/60">
                {user?.avatar_url && (
                  <div className="relative h-8 w-8 rounded-full overflow-hidden border-2 border-kick">
                    <img 
                      src={user.avatar_url} 
                      alt={user.username} 
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <span className="font-medium">{user?.username}</span>
                
                <Button variant="ghost" size="icon" onClick={logout} className="ml-1 text-muted-foreground hover:text-foreground">
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Log out</span>
                </Button>
              </div>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="kick">Login with Kick</Button>
            </Link>
          )}
        </nav>
        
        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-16 z-50 bg-background/95 backdrop-blur-sm p-4">
            <div className="flex flex-col gap-4 items-center pt-8">
              {isAuthenticated ? (
                <>
                  {user?.avatar_url && (
                    <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-kick mb-2">
                      <img 
                        src={user.avatar_url} 
                        alt={user.username} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <span className="font-medium text-lg">{user?.username}</span>
                  
                  <div className="w-full max-w-xs mt-6 grid gap-3">
                    <Link to="/link-sorter" className="w-full">
                      <Button variant="outline" className="w-full justify-start">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Link Sorter
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="destructive" 
                      className="w-full justify-start" 
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </Button>
                  </div>
                </>
              ) : (
                <Link to="/login" className="w-full max-w-xs">
                  <Button variant="kick" className="w-full">Login with Kick</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
