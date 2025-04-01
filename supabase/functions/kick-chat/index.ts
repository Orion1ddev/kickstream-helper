
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channel_name, access_token } = await req.json();
    
    if (!channel_name) {
      throw new Error("No channel name provided");
    }

    console.log(`Fetching chat messages for channel: ${channel_name}`);
    
    try {
      // For now, we'll simulate chat messages as the API integration is pending
      // In a real implementation, we would connect to Kick's chat API
      const mockMessages = [
        { id: "1", username: "user1", message: "Check out this link: https://example.com/news1", timestamp: new Date().getTime() - 5000 },
        { id: "2", username: "user2", message: "Here's another article: https://example.com/article", timestamp: new Date().getTime() - 4000 },
        { id: "3", username: "user3", message: "Did you see this? https://example.com/video", timestamp: new Date().getTime() - 3000 },
        { id: "4", username: "user4", message: "Just chatting, no links here", timestamp: new Date().getTime() - 2000 },
        { id: "5", username: "user5", message: "https://example.com/news1 already shared this one", timestamp: new Date().getTime() - 1000 },
      ];
      
      return new Response(JSON.stringify({ messages: mockMessages }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (fetchError) {
      console.error("Error fetching chat messages:", fetchError);
      throw new Error(`Error fetching chat messages: ${fetchError.message}`);
    }
  } catch (error) {
    console.error("Error in kick-chat function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
