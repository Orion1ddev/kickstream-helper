
/**
 * Simple mock client for API interactions
 * This replaces the Supabase dependency
 */

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

class MockClient {
  // Simple method to invoke a "function" which will just fetch data from a local API endpoint
  functions = {
    invoke: async <T>(functionName: string, options?: { body: any }): Promise<ApiResponse<T>> => {
      try {
        console.log(`Invoking function: ${functionName}`, options?.body);
        
        // For the kick-chat function, return mock data
        if (functionName === 'kick-chat') {
          const mockChatData = {
            messages: [
              {
                content: "Check out this link https://example.com/cool-stuff",
                username: "user1",
                timestamp: new Date().toISOString()
              },
              {
                content: "Another great resource: https://docs.example.com/api",
                username: "user2",
                timestamp: new Date().toISOString()
              }
            ]
          };
          
          // If a channel was specified, add it to the log but use mock data
          if (options?.body?.channel) {
            console.log(`Mock data for channel: ${options.body.channel}`);
          }
          
          return { data: mockChatData as T, error: null };
        }
        
        // Default response for unhandled functions
        return { 
          data: null, 
          error: new Error(`Function ${functionName} is not implemented in the mock client`) 
        };
      } catch (error: any) {
        console.error(`Error invoking function ${functionName}:`, error);
        return { data: null, error };
      }
    }
  };
}

// Export an instance of the mock client
export const supabase = new MockClient();
