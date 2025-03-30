
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CLIENT_ID = "01JQMD5PMFX0MFYPMT9A7YDHGC";
const CLIENT_SECRET = "1660e3d58a4791cb8339f1fb63b22f2386b19618d986624b23952becf02b1f55";
const REDIRECT_URL = "https://preview--kickstream-helper.lovable.app/login";

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
    const { code, code_verifier } = await req.json();
    
    if (!code) {
      throw new Error("No authorization code provided");
    }

    console.log("Exchanging code for token");
    console.log("Using clientId:", CLIENT_ID);
    console.log("Using redirect:", REDIRECT_URL);
    console.log("Code verifier provided:", code_verifier ? "Yes" : "No");
    
    // Prepare the token request parameters
    const tokenRequest = {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URL,
      code: code,
    };

    // Add code_verifier if provided (for PKCE flow)
    if (code_verifier) {
      Object.assign(tokenRequest, { code_verifier });
    }

    console.log("Token request payload structure:", Object.keys(tokenRequest).join(", "));

    // Perform the token exchange request
    const tokenResponse = await fetch("https://id.kick.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(tokenRequest),
    });

    const responseText = await tokenResponse.text();
    console.log("Token response status:", tokenResponse.status);
    console.log("Token response headers:", JSON.stringify(Object.fromEntries([...tokenResponse.headers])));
    console.log("Token response body:", responseText);

    // Check if the response was successful
    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange token: ${tokenResponse.status} ${responseText}`);
    }

    // Parse the response text as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log("Access token received:", data.access_token ? "Yes" : "No");
      console.log("Refresh token received:", data.refresh_token ? "Yes" : "No");
    } catch (e) {
      console.error("Failed to parse response as JSON:", e);
      throw new Error(`Invalid response format: ${responseText}`);
    }

    if (!data.access_token) {
      throw new Error("No access token received from Kick");
    }

    console.log("Token exchange successful");
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in kick-auth function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
