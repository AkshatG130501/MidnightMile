import { supabase } from '../config/supabase';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

export class AuthService {
  // Sign up with email and password
  static async signUp(email, password, fullName = "") {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
        message:
          "Account created successfully! Please check your email for verification.",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Sign in with email and password
  static async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Sign in with Google using proper OAuth flow
  static async signInWithGoogle() {
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'midnightmile',
        path: 'auth'
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Open OAuth URL in browser
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'success' && result.url) {
          // Extract the session from the callback URL
          const url = new URL(result.url);
          const fragment = url.hash.substring(1);
          const params = new URLSearchParams(fragment);
          
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken) {
            // Set the session in Supabase
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (sessionError) {
              throw new Error(sessionError.message);
            }

            return {
              success: true,
              user: sessionData.user,
              session: sessionData.session,
            };
          }
        }
      }

      throw new Error('OAuth flow was cancelled or failed');
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Sign in with Apple using proper OAuth flow
  static async signInWithApple() {
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'midnightmile',
        path: 'auth'
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUri,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Open OAuth URL in browser
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'success' && result.url) {
          // Extract the session from the callback URL
          const url = new URL(result.url);
          const fragment = url.hash.substring(1);
          const params = new URLSearchParams(fragment);
          
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken) {
            // Set the session in Supabase
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (sessionError) {
              throw new Error(sessionError.message);
            }

            return {
              success: true,
              user: sessionData.user,
              session: sessionData.session,
            };
          }
        }
      }

      throw new Error('OAuth flow was cancelled or failed');
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Sign out
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: "Signed out successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        user,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get current session
  static async getCurrentSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        session,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Reset password
  static async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "your-app-scheme://auth/reset-password",
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: "Password reset email sent successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
}
