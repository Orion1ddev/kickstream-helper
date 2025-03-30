
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
    const userResponse = await fetch("https://kick.com/api/v2/user/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Accept": "application/json"
      },
    });

    const responseText = await userResponse.text();
    console.log("User data response status:", userResponse.status);
    console.log("User data response headers:", JSON.stringify(Object.fromEntries([...userResponse.headers])));
    console.log("User data response body:", responseText);

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user data: ${userResponse.status} ${responseText}`);
    }

    // Parse the response text as JSON
    let userData;
    try {
      userData = JSON.parse(responseText);
      console.log("User ID received:", userData.id ? "Yes" : "No");
      console.log("Username received:", userData.username ? "Yes" : "No");
    } catch (e) {
      console.error("Failed to parse user data as JSON:", e);
      throw new Error(`Invalid user data format: ${responseText}`);
    }
    
    if (!userData.id) {
      throw new Error("Invalid user data received from Kick");
    }
    
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
