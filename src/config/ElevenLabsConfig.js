/**
 * Eleven Labs Configuration
 * Handles API key and settings from environment variables
 */

import Constants from "expo-constants";

export const ELEVEN_LABS_CONFIG = {
  // Get API key from expo config extra section (primary source)
  apiKey: Constants.expoConfig?.extra?.ELEVEN_LABS_API_KEY,

  // Default voice ID from config or fallback to Bella
  defaultVoiceId: Constants.expoConfig?.extra?.ELEVEN_LABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB", // Bella voice as fallback

  // Base URL for Eleven Labs API
  baseURL: "https://api.elevenlabs.io/v1",

  // Default model
  defaultModel: "eleven_monolingual_v1",

  // Check if API key is configured and valid
  isConfigured: () => {
    const apiKey = Constants.expoConfig?.extra?.ELEVEN_LABS_API_KEY;
    const isValid = (
      apiKey &&
      apiKey !== "your_api_key_here" &&
      apiKey !== "YOUR_ELEVEN_LABS_API_KEY_HERE" &&
      apiKey !== "${ELEVEN_LABS_API_KEY}" && // Check for unsubstituted template
      apiKey.length > 10 &&
      apiKey.startsWith('sk_') // ElevenLabs API keys should start with 'sk_'
    );
    
    if (!isValid) {
      console.log("⚠️ ElevenLabs API key validation failed:");
      console.log("- Has key:", !!apiKey);
      console.log("- Key length:", apiKey?.length || 0);
      console.log("- Starts with 'sk_':", apiKey?.startsWith('sk_'));
      console.log("- Not placeholder:", apiKey !== "your_api_key_here");
    }
    
    return isValid;
  },

  // Get API key with validation
  getApiKey: () => {
    const apiKey = Constants.expoConfig?.extra?.ELEVEN_LABS_API_KEY;
    if (
      !apiKey ||
      apiKey === "your_api_key_here" ||
      apiKey === "YOUR_ELEVEN_LABS_API_KEY_HERE" ||
      apiKey === "${ELEVEN_LABS_API_KEY}"
    ) {
      throw new Error(
        "Eleven Labs API key not configured properly in app.config.js extra section."
      );
    }
    return apiKey;
  },

  // Debug function to check configuration
  debugConfig: () => {
    const apiKey = Constants.expoConfig?.extra?.ELEVEN_LABS_API_KEY;
    const voiceId = Constants.expoConfig?.extra?.ELEVEN_LABS_VOICE_ID;
    
    console.log("🔍 ElevenLabs Config Debug:");
    console.log("- API Key exists:", !!apiKey);
    console.log("- API Key length:", apiKey?.length || 0);
    console.log("- API Key starts with 'sk_':", apiKey?.startsWith('sk_'));
    console.log("- Voice ID:", voiceId);
    console.log("- Full extra config:", Constants.expoConfig?.extra);
    
    return {
      hasApiKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      isValidFormat: apiKey?.startsWith('sk_'),
      voiceId: voiceId,
    };
  },
};

// Log configuration status (only in development)
if (__DEV__) {
  console.log("🔧 Eleven Labs Config:", {
    isConfigured: ELEVEN_LABS_CONFIG.isConfigured(),
    hasApiKey: !!ELEVEN_LABS_CONFIG.apiKey,
    apiKeyLength: ELEVEN_LABS_CONFIG.apiKey?.length || 0,
    defaultVoice: ELEVEN_LABS_CONFIG.defaultVoiceId,
  });
}
