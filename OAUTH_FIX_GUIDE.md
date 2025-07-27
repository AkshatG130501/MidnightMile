# Google OAuth Configuration Fix - Supabase Approach

## Problem
Getting "redirect_uri_mismatch" error when trying to sign in with Google.

## Root Cause
The redirect URI in Google Cloud Console doesn't match what Supabase is using.

## Solution: Configure Supabase OAuth

### Step 1: Configure Supabase Project
1. Go to your Supabase Dashboard
2. Navigate to Authentication > Settings > Auth Providers
3. Enable Google provider
4. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console

### Step 2: Get Supabase Redirect URI
Your Supabase redirect URI will be:
```
https://[your-project-ref].supabase.co/auth/v1/callback
```

For your project: `https://tobfgrcywivlvlaygguq.supabase.co/auth/v1/callback`

### Step 3: Update Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Select your project  
3. Go to "APIs & Services" > "Credentials"
4. Click on your OAuth 2.0 Client ID
5. In "Authorized redirect URIs", add:
   - `https://tobfgrcywivlvlaygguq.supabase.co/auth/v1/callback`
   - `midnightmile://auth` (for mobile app callback)
6. Click "Save"

### Step 4: Configure Mobile App Redirect
In your app, we're now using the simple redirect:
```
midnightmile://auth
```

This needs to be configured in:
1. **Supabase**: Auth Settings > Site URL should include your app scheme
2. **Google Console**: As an authorized redirect URI

## Updated Code Approach

The AuthService now uses the simplified Supabase OAuth approach:

```javascript
// Simple Supabase OAuth - no complex Expo AuthSession needed
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: "midnightmile://auth",
  },
});
```

## Benefits of Supabase Approach:
- ✅ Simpler configuration
- ✅ Better error handling
- ✅ Automatic session management
- ✅ Works consistently across platforms
- ✅ No complex URL parsing needed

## Testing:
1. Restart your development server
2. Try Google sign-in
3. Should redirect to Google, then back to your app
4. User should be automatically signed in

This approach lets Supabase handle all the OAuth complexity while you just need to configure the redirect URIs correctly.
