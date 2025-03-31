
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

    // Call the Kick API to fetch user data
    const response = await fetch('https://kick.com/api/v2/user/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log("User data response status:", response.status);
    console.log("User data response headers:", JSON.stringify(Object.fromEntries([...response.headers])));
    
    const responseText = await response.text();
    console.log("User data response body:", responseText);

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.status} ${responseText}`);
    }

    try {
      const userData = JSON.parse(responseText);
      if (!userData || !userData.id) {
        throw new Error("Invalid user data format");
      }
      
      console.log("User data successfully fetched");
      
      return new Response(JSON.stringify(userData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.error("Error parsing user data:", e);
      throw new Error(`Failed to parse user data: ${e.message}`);
    }
  } catch (error) {
    console.error("Error in kick-user function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
