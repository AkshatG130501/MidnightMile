import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Temporary: Use hardcoded values to test if @env import is causing issues
const supabaseUrl = "https://gepwiodjsgqudehxkuvv.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcHdpb2Rqc2dxdWRlaHhrdXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MzYwOTcsImV4cCI6MjA2OTExMjA5N30.uKjbJhsqQhTyt5lIlnPYk4DlGGVPr317nFKhds7iz_E";

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
