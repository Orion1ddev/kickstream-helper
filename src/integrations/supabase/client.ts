// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://qevjedwxnfaxmllrsxvq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldmplZHd4bmZheG1sbHJzeHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjcyMTUsImV4cCI6MjA1ODk0MzIxNX0.f85V3LSwLJ9G1lSfE5ZQe0QkmsnL2eYncr9ArIYbecE";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);