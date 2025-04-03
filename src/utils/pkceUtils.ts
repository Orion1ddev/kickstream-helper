
/**
 * PKCE (Proof Key for Code Exchange) authentication utilities
 * Used for secure OAuth flows with Kick.com
 */

// Generate a random code verifier for PKCE flow (cryptographically secure random string)
export const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Generate a SHA-256 hash of the code verifier
export const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
};

// Convert ArrayBuffer to base64url encoding (URL-safe base64)
export const base64urlencode = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Build the Kick authorization URL with PKCE parameters
 * This creates the URL that the user will be redirected to for authentication
 */
export const buildKickAuthUrl = async (codeVerifier: string, state: string): Promise<string> => {
  // Generate code challenge from verifier using SHA-256
  const codeChallenge = await sha256(codeVerifier).then(base64urlencode);
  
  // Set up Kick OAuth parameters
  const CLIENT_ID = "01JQMD5PMFX0MFYPMT9A7YDHGC";
  const REDIRECT_URI = window.location.origin + "/login";
  const SCOPES = "user:read channel:read events:read events:subscribe";
  
  // Build the authorization URL with PKCE parameters
  const authUrl = new URL("https://id.kick.com/oauth/authorize");
  authUrl.searchParams.append("client_id", CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", SCOPES);
  authUrl.searchParams.append("code_challenge", codeChallenge);
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("state", state);
  
  return authUrl.toString();
};
