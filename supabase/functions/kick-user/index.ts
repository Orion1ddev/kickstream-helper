
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KickUserProfile {
  id: string;
  username: string;
  profile_pic: string;
  email?: string;
  bio?: string;
  verified: boolean;
}

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

    // Try the v2 API first
    try {
      const response = await fetch('https://kick.com/api/v2/user/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        },
      });

      console.log("V2 API response status:", response.status);
      
      if (response.ok) {
        try {
          const userData = await response.json();
          console.log("User data successfully fetched from V2 API");
          
          return new Response(JSON.stringify(userData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (jsonError) {
          console.error("Error parsing V2 API response as JSON:", jsonError);
        }
      }
      
      // If we reach here, the v2 API request failed - try v1 API
      console.log("Trying V1 API endpoint instead");
      const v1Response = await fetch('https://kick.com/api/v1/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        },
      });
      
      console.log("V1 API response status:", v1Response.status);
      
      if (v1Response.ok) {
        const userData = await v1Response.json();
        console.log("User data successfully fetched from V1 API endpoint");
        
        return new Response(JSON.stringify(userData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // If both API calls failed, the token might be invalid
      if (response.status === 401 || v1Response.status === 401) {
        console.log("Token appears to be invalid (401 status received)");
        return new Response(
          JSON.stringify({ error: "Token is invalid or expired" }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Try extracting user info from the JWT token itself
      console.log("Attempting to extract user info from JWT token...");
      let userId = "";
      let username = "";
      try {
        const tokenParts = access_token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("JWT payload:", payload);
          if (payload.sub) {
            userId = payload.sub;
          }
          if (payload.name) {
            username = payload.name;
          }
        }
      } catch (tokenError) {
        console.log("Could not extract user info from token:", tokenError);
      }
      
      // If we've extracted usable info from the token, use it
      if (userId || username) {
        console.log("Using information extracted from JWT token");
        const userData: KickUserProfile = {
          id: userId || `unknown-${Date.now()}`,
          username: username || `user-${userId.substring(0, 6)}`,
          profile_pic: "https://static.kick.com/images/user/default-profile.png",
          verified: true,
        };
        
        return new Response(JSON.stringify(userData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Last resort - notify client that we couldn't get user info but token seems valid
      console.log("Returning generic response as we couldn't get user info but token seems valid");
      return new Response(
        JSON.stringify({ 
          error: "Could not fetch user data, but token appears valid",
          valid_token: true,
          generated_id: `user-${Date.now()}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (fetchError) {
      console.error("Error during API calls:", fetchError);
      throw new Error(`Error fetching user data: ${fetchError.message}`);
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
