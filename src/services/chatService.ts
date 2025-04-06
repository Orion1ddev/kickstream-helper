
/**
 * Service for handling chat-related API calls
 */

export interface ChatMessage {
  content: string;
  username: string;
  timestamp: string;
}

export interface ChatData {
  messages: ChatMessage[];
}

/**
 * Fetch chat messages for a given channel
 * This replaces the Supabase edge function call
 */
export const fetchChannelMessages = async (channelName: string): Promise<{
  success: boolean;
  data: ChatData | null;
  error: Error | null;
}> => {
  try {
    console.log(`Fetching messages for channel: ${channelName}`);
    
    // This is a mock implementation
    // In a real implementation, you would call the Kick API directly
    
    // For demo purposes, generate some mock data with links
    const mockMessages: ChatMessage[] = [
      {
        content: `Check out this link https://example.com/cool-stuff?channel=${channelName}`,
        username: "user1",
        timestamp: new Date().toISOString()
      },
      {
        content: `Another great resource for ${channelName}: https://docs.example.com/api/${channelName}`,
        username: "user2",
        timestamp: new Date(Date.now() - 60000).toISOString()
      },
      {
        content: `Here's a tutorial I found helpful: https://tutorial.example.com/${channelName}/guide`,
        username: "user3",
        timestamp: new Date(Date.now() - 120000).toISOString()
      }
    ];
    
    // Add some channel-specific mock data
    if (channelName.toLowerCase().includes('gaming')) {
      mockMessages.push({
        content: "Check out this gaming guide https://gameguide.example.com/tips",
        username: "gamer123",
        timestamp: new Date(Date.now() - 180000).toISOString()
      });
    }
    
    const data: ChatData = {
      messages: mockMessages
    };
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { success: true, data, error: null };
  } catch (error: any) {
    console.error("Error fetching channel messages:", error);
    return { success: false, data: null, error };
  }
};
