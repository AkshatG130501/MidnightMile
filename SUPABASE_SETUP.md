# Supabase Authentication Setup Guide

## Prerequisites

1. **Create a Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up/login and create a new project
   - Wait for the project to be fully provisioned

## Configuration Steps

### 1. Get Your Supabase Credentials

From your Supabase project dashboard:
- Go to **Settings** → **API**
- Copy your **Project URL** 
- Copy your **anon/public** key

### 2. Update Supabase Configuration

Edit `src/config/supabase.js` and replace the placeholder values:

```javascript
const supabaseUrl = 'YOUR_ACTUAL_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_ACTUAL_SUPABASE_ANON_KEY';
```

### 3. Configure Authentication Providers (Optional)

#### Google OAuth Setup:
1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials
4. Set redirect URL to: `your-app-scheme://auth/callback`

#### Apple OAuth Setup:
1. Enable **Apple** provider in Supabase
2. Configure Apple Sign In in your Apple Developer account
3. Add necessary credentials to Supabase

### 4. Set Up Deep Linking (Required for OAuth)

Add to your `app.json`:

```json
{
  "expo": {
    "scheme": "midnightmile",
    "...": "other config"
  }
}
```

### 5. Database Schema (Optional)

Supabase automatically creates auth tables. Optionally create additional user profile tables:

```sql
-- User profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

## Features Implemented

### ✅ Authentication Screens
- **LandingScreen**: Animated intro with auth options
- **LoginScreen**: Email/password login with social options
- **SignUpScreen**: Registration with validation

### ✅ Authentication Methods
- Email/password signup and login
- Google OAuth (requires setup)
- Apple OAuth (requires setup)
- Password reset functionality

### ✅ Security Features
- Secure token storage with AsyncStorage
- Auto session refresh
- Session persistence
- Input validation
- Error handling

## Usage

### Basic Flow
1. User sees landing screen with logo animation
2. Chooses login or signup
3. Completes authentication
4. Gets redirected to main app

### AuthService Methods
```javascript
// Sign up
const result = await AuthService.signUp(email, password, fullName);

// Sign in
const result = await AuthService.signIn(email, password);

// Social login
const result = await AuthService.signInWithGoogle();

// Sign out
const result = await AuthService.signOut();

// Get current user
const result = await AuthService.getCurrentUser();
```

## Next Steps

1. **Update Navigation**: Add Login/SignUp screens to your navigation stack
2. **Configure Supabase**: Replace placeholder credentials with real ones
3. **Test Authentication**: Try signup/login flows
4. **Set Up OAuth**: Configure Google/Apple if needed
5. **Add Auth Guards**: Protect routes that require authentication
6. **Handle Auth State**: Listen for auth changes throughout the app

## Troubleshooting

- **OAuth not working**: Check redirect URLs and provider configuration
- **Session not persisting**: Verify AsyncStorage setup
- **Network errors**: Check Supabase URL and keys
- **Build errors**: Ensure all dependencies are installed

## Security Notes

- Never commit real Supabase keys to version control
- Use environment variables for production
- Implement proper Row Level Security policies
- Validate user input on both client and server
- Use HTTPS in production
