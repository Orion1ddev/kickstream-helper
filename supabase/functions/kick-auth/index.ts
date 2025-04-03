
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CLIENT_ID = "01JQMD5PMFX0MFYPMT9A7YDHGC";
const CLIENT_SECRET = "1660e3d58a4791cb8339f1fb63b22f2386b19618d986624b23952becf02b1f55";
const REDIRECT_URL = "https://preview--kickstream-helper.lovable.app/login";

// Define CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process Kick.com OAuth token requests
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, code_verifier, redirect_uri } = await req.json();
    
    if (!code) {
      throw new Error("No authorization code provided");
    }

    // Use the provided redirect_uri or fall back to the default
    const effectiveRedirectUri = redirect_uri || REDIRECT_URL;

    console.log("Exchanging code for token");
    console.log("Using clientId:", CLIENT_ID);
    console.log("Using redirect:", effectiveRedirectUri);
    console.log("Code verifier provided:", code_verifier ? "Yes" : "No");
    
    // Create form data for the token request (OAuth standard)
    const formData = new FormData();
    formData.append("grant_type", "authorization_code");
    formData.append("client_id", CLIENT_ID);
    formData.append("client_secret", CLIENT_SECRET);
    formData.append("redirect_uri", effectiveRedirectUri);
    formData.append("code", code);
    
    // Add code_verifier if provided (for PKCE flow)
    if (code_verifier) {
      formData.append("code_verifier", code_verifier);
    }

    // Perform the token exchange request
    const tokenResponse = await fetch("https://id.kick.com/oauth/token", {
      method: "POST",
      headers: {
        "Accept": "application/json"
      },
      body: formData,
    });

    const responseText = await tokenResponse.text();
    console.log("Token response status:", tokenResponse.status);
    
    // Check if the response was successful
    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange token: ${tokenResponse.status} ${responseText}`);
    }

    // Parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log("Access token received:", data.access_token ? "Yes" : "No");
      console.log("Refresh token received:", data.refresh_token ? "Yes" : "No");
      console.log("Token scopes:", data.scope);
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
