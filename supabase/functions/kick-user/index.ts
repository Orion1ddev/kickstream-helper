
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
    const { access_token } = await req.json();
    
    if (!access_token) {
      throw new Error("No access token provided");
    }

    console.log("Fetching user data with access token");
    
    // Get user profile with access token
    const response = await fetch("https://kick.com/api/v2/user/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("User data fetch failed:", errorText);
      throw new Error(`Failed to fetch user data: ${response.status} ${errorText}`);
    }

    const userData = await response.json();
    console.log("User data fetch successful");
    
    return new Response(JSON.stringify(userData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in kick-user function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
