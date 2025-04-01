
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link as LinkIcon, Trash2, ExternalLink, ArrowDownUp, RefreshCw } from "lucide-react";
import { Navigate } from "react-router-dom";

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
}

interface Link {
  id: string;
  url: string;
  source: string;
  timestamp: number;
  visited: boolean;
}

const extractLinks = (message: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return message.match(urlRegex) || [];
};

const LinkSorter = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [channelName, setChannelName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const { toast } = useToast();

  const fetchChatMessages = useCallback(async () => {
    if (!channelName.trim() || !isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('kick-chat', {
        body: { 
          channel_name: channelName,
          access_token: user?.access_token 
        },
      });

      if (error) throw error;
      
      setMessages(data.messages || []);
      
      // Extract links from messages
      const newLinks = data.messages.flatMap((msg: ChatMessage) => {
        const extractedUrls = extractLinks(msg.message);
        return extractedUrls.map((url: string) => ({
          id: `${msg.id}-${url}`,
          url,
          source: msg.username,
          timestamp: msg.timestamp,
          visited: false
        }));
      });
      
      // Filter out duplicate links
      const uniqueLinks = newLinks.filter((link: Link) => 
        !links.some(existingLink => existingLink.url === link.url)
      );
      
      setLinks(prev => [...prev, ...uniqueLinks]);
      
      toast({
        title: "Chat Fetched",
        description: `Loaded ${data.messages.length} messages and found ${uniqueLinks.length} new links.`,
      });
    } catch (error: any) {
      console.error("Error fetching chat:", error);
      toast({
        title: "Error",
        description: `Failed to fetch chat: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [channelName, isAuthenticated, user, links, toast]);

  const handleMarkVisited = (id: string) => {
    setLinks(prev => 
      prev.map(link => 
        link.id === id ? { ...link, visited: !link.visited } : link
      )
    );
  };

  const handleRemoveLink = (id: string) => {
    setLinks(prev => prev.filter(link => link.id !== id));
  };

  const handleClearAll = () => {
    setLinks([]);
    toast({
      title: "Links Cleared",
      description: "All links have been removed from the list.",
    });
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "newest" ? "oldest" : "newest");
  };

  const sortedLinks = [...links].sort((a, b) => {
    return sortOrder === "newest" 
      ? b.timestamp - a.timestamp 
      : a.timestamp - b.timestamp;
  });

  const sortedMessages = [...messages].sort((a, b) => {
    return sortOrder === "newest" 
      ? b.timestamp - a.timestamp 
      : a.timestamp - b.timestamp;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-16 w-16 rounded-full bg-kick/20 animate-pulse-green"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container py-6">
        <h1 className="text-3xl font-bold mb-6">Link Sorter</h1>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Kick channel name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={fetchChatMessages} 
                disabled={isLoading || !channelName.trim()}
              >
                {isLoading ? (
                  <>
                    <span className="mr-2 h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Fetch Chat
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="links" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="links">Collected Links</TabsTrigger>
            <TabsTrigger value="chat">Chat Feed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="links">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl">
                  <div className="flex items-center">
                    <LinkIcon className="mr-2 h-5 w-5" />
                    Collected Links
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={toggleSortOrder} 
                      className="ml-2"
                    >
                      <ArrowDownUp className="h-4 w-4" />
                      <span className="ml-1">{sortOrder === "newest" ? "Newest" : "Oldest"}</span>
                    </Button>
                  </div>
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearAll}
                  disabled={links.length === 0}
                >
                  Clear All
                </Button>
              </CardHeader>
              <CardContent>
                {links.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No links collected yet. Fetch a chat to start collecting links.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Link</TableHead>
                        <TableHead>Posted By</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedLinks.map((link) => (
                        <TableRow 
                          key={link.id} 
                          className={link.visited ? "text-muted-foreground" : ""}
                        >
                          <TableCell className="font-medium">
                            <a 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center hover:underline"
                            >
                              <span className="truncate max-w-[250px]">{link.url}</span>
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell>{link.source}</TableCell>
                          <TableCell>
                            {new Date(link.timestamp).toLocaleTimeString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => handleMarkVisited(link.id)}
                                title={link.visited ? "Mark as unvisited" : "Mark as visited"}
                              >
                                <span className={`h-2 w-2 rounded-full ${link.visited ? 'bg-green-500' : 'bg-gray-300'}`} />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => handleRemoveLink(link.id)}
                                title="Remove link"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="chat">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl">
                  <div className="flex items-center">
                    Chat Messages
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={toggleSortOrder} 
                      className="ml-2"
                    >
                      <ArrowDownUp className="h-4 w-4" />
                      <span className="ml-1">{sortOrder === "newest" ? "Newest" : "Oldest"}</span>
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages to display. Enter a channel name and fetch the chat.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {sortedMessages.map((msg) => {
                      // Process the message to highlight links
                      const messageParts = [];
                      let lastIndex = 0;
                      const links = extractLinks(msg.message);
                      
                      if (links.length > 0) {
                        links.forEach((link, i) => {
                          const linkIndex = msg.message.indexOf(link, lastIndex);
                          if (linkIndex > lastIndex) {
                            messageParts.push(msg.message.substring(lastIndex, linkIndex));
                          }
                          messageParts.push(
                            <a 
                              key={i} 
                              href={link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              {link}
                            </a>
                          );
                          lastIndex = linkIndex + link.length;
                        });
                        
                        if (lastIndex < msg.message.length) {
                          messageParts.push(msg.message.substring(lastIndex));
                        }
                      } else {
                        messageParts.push(msg.message);
                      }
                      
                      return (
                        <div key={msg.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-start">
                            <span className="font-bold">{msg.username}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="mt-1">{messageParts}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LinkSorter;
