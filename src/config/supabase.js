import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

const supabaseUrl = 'https://tobfgrcywivlvlaygguq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvYmZncmN5d2l2bHZsYXlnZ3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MTY2MTUsImV4cCI6MjA2OTE5MjYxNX0.e6ZPrry72oOQDD4oDozF5M9j3JDjdAMksBiJiMZIOe4';

// TODO: Re-enable environment variables once app is working
// import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
// const supabaseUrl = SUPABASE_URL;
// const supabaseAnonKey = SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
