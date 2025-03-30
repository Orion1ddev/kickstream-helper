
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
    const { code } = await req.json();
    
    if (!code) {
      throw new Error("No authorization code provided");
    }

    console.log("Exchanging code for token");
    console.log("Using clientId:", CLIENT_ID);
    console.log("Using redirect:", REDIRECT_URL);
    
    // Exchange authorization code for access token
    const response = await fetch("https://kick.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URL,
        code: code,
      }),
    });

    const responseText = await response.text();
    console.log("Token response status:", response.status);
    console.log("Token response:", responseText);

    if (!response.ok) {
      throw new Error(`Failed to exchange token: ${response.status} ${responseText}`);
    }

    // Parse the response text as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse response as JSON:", e);
      throw new Error(`Invalid response format: ${responseText}`);
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
