
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2, ExternalLink, Trash2, Copy, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Link {
  id: string;
  url: string;
  title: string;
  timestamp: string;
  username: string;
}

interface ChatMessage {
  content: string;
  username: string;
  timestamp: string;
}

interface ChatData {
  messages: ChatMessage[];
}

const LinkSorter = () => {
  const { user, isAuthenticated } = useAuth();
  const [channelUrl, setChannelUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [channelLinks, setChannelLinks] = useState<Link[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchChannelLinks = async () => {
    if (!channelUrl.trim()) {
      toast({
        title: "Empty Channel URL",
        description: "Please enter a valid Kick channel URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      let channelName = channelUrl;
      // Extract channel name from URL if it's a full URL
      if (channelUrl.includes('kick.com/')) {
        channelName = channelUrl.split('kick.com/')[1].split('/')[0].trim();
      }
      
      // Additional validation
      if (!channelName || channelName.includes('http')) {
        throw new Error("Invalid channel name. Please enter a valid Kick channel URL or name.");
      }

      console.log("Fetching links for channel:", channelName);

      const { data, error } = await supabase.functions.invoke<ChatData>('kick-chat', {
        body: { channel: channelName }
      });

      if (error) {
        console.error("Error from kick-chat function:", error);
        throw new Error(error.message || "Failed to fetch channel data");
      }

      if (!data) {
        throw new Error("No data received from the server");
      }

      console.log("Received channel data:", data);

      const links: Link[] = [];
      const seen = new Set<string>();

      if (data && data.messages) {
        data.messages.forEach((msg: ChatMessage) => {
          if (!msg.content) return;
          
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const matches = msg.content.match(urlRegex);
          
          if (matches) {
            matches.forEach((url: string) => {
              if (!seen.has(url)) {
                seen.add(url);
                links.push({
                  id: Math.random().toString(36).substring(2),
                  url: url,
                  title: url.split('/').pop() || url,
                  timestamp: msg.timestamp || new Date().toISOString(),
                  username: msg.username || 'Unknown'
                });
              }
            });
          }
        });
      }

      console.log(`Found ${links.length} links in channel`);
      setChannelLinks(links);
      
      if (links.length === 0) {
        toast({
          title: "No links found",
          description: `No links were found in the chat for channel "${channelName}"`,
        });
      } else {
        toast({
          title: "Links retrieved",
          description: `Found ${links.length} links in channel "${channelName}"`,
        });
      }
    } catch (error: any) {
      console.error("Error fetching channel links:", error);
      const errorMsg = error.message || "Failed to fetch links from channel";
      setErrorMessage(errorMsg);
      toast({
        title: "Error fetching channel links",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeLink = (id: string) => {
    setChannelLinks(prev => prev.filter(link => link.id !== id));
    toast({
      title: "Link removed",
      description: "The link has been removed from your list",
    });
  };

  const copyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast({
        title: "Link copied",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container py-8">
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Link Sorter</h1>
            <p className="text-muted-foreground">
              Extract and organize links from Kick.com chat channels
            </p>
          </div>

          <Tabs defaultValue="links" className="space-y-6">
            <TabsList className="mb-2">
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="saved">Saved Links</TabsTrigger>
            </TabsList>
            
            <TabsContent value="links" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Channel Links</CardTitle>
                  <CardDescription>
                    Enter a Kick.com channel URL to extract shared links
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter channel URL or name (e.g., kick.com/channelname or just channelname)"
                      value={channelUrl}
                      onChange={(e) => setChannelUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={fetchChannelLinks} 
                      disabled={isLoading || !channelUrl.trim()}
                      variant="kick"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      {isLoading ? 'Fetching...' : 'Fetch Links'}
                    </Button>
                  </div>
                  
                  {errorMessage && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}
                  
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-kick" />
                    </div>
                  ) : channelLinks.length > 0 ? (
                    <div className="space-y-4 mt-6">
                      <h3 className="text-lg font-medium">Found {channelLinks.length} links</h3>
                      
                      <div className="grid gap-4">
                        {channelLinks.map((link) => (
                          <Card key={link.id} className="overflow-hidden bg-card/50 hover:bg-card/80 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium line-clamp-1 mb-1">{link.title}</h4>
                                  <p className="text-muted-foreground text-sm truncate mb-2">{link.url}</p>
                                  <div className="text-xs text-muted-foreground flex items-center">
                                    <span>Shared by {link.username} • {new Date(link.timestamp).toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => copyLink(link.url, link.id)}
                                    className="h-8 w-8"
                                  >
                                    {copiedId === link.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => window.open(link.url, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive/80"
                                    onClick={() => removeLink(link.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <ExternalLink className="h-12 w-12 text-muted-foreground/40 mb-4" />
                      <h3 className="text-lg font-medium">No links found</h3>
                      <p className="text-muted-foreground max-w-md">
                        Enter a Kick channel URL or name above and click "Fetch Links" to extract shared links from the chat.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="saved">
              <Card>
                <CardHeader>
                  <CardTitle>Saved Links</CardTitle>
                  <CardDescription>
                    Your saved links from various channels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ExternalLink className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <h3 className="text-lg font-medium">No saved links yet</h3>
                    <p className="text-muted-foreground max-w-md">
                      Links you save will appear here for future reference.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default LinkSorter;
