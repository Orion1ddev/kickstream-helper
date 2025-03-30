
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const Index = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <section className="py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  KickStream Helper
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Boost your streaming performance with advanced tools and insights for Kick.com streamers
                </p>
              </div>
              <div className="space-x-4">
                {isAuthenticated ? (
                  <Link to="/dashboard">
                    <Button size="lg">Go to Dashboard</Button>
                  </Link>
                ) : (
                  <Link to="/login">
                    <Button size="lg">Get Started</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-3 items-start">
              <div className="group relative rounded-lg border p-6 shadow-md transition-shadow hover:shadow-lg">
                <div className="flex flex-col space-y-2">
                  <h3 className="text-2xl font-bold">Stream Analytics</h3>
                  <p className="text-muted-foreground">Track your viewer engagement, chat activity, and growth metrics.</p>
                </div>
              </div>
              <div className="group relative rounded-lg border p-6 shadow-md transition-shadow hover:shadow-lg">
                <div className="flex flex-col space-y-2">
                  <h3 className="text-2xl font-bold">Chat Management</h3>
                  <p className="text-muted-foreground">Advanced moderation tools and customizable chat commands.</p>
                </div>
              </div>
              <div className="group relative rounded-lg border p-6 shadow-md transition-shadow hover:shadow-lg">
                <div className="flex flex-col space-y-2">
                  <h3 className="text-2xl font-bold">Viewer Engagement</h3>
                  <p className="text-muted-foreground">Interact with your community with polls, giveaways, and more.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} KickStream Helper. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
