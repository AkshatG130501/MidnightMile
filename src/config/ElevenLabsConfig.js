/**
 * Eleven Labs Configuration
 * Handles API key and settings from environment variables
 */

import Constants from "expo-constants";

export const ELEVEN_LABS_CONFIG = {
  // Get API key from app.json extra section (primary source)
  apiKey: process.env.ELEVEN_LABS_API_KEY,

  // Default voice ID from config or fallback to Bella
  defaultVoiceId: process.env.ELEVEN_LABS_VOICE_ID,

  // Base URL for Eleven Labs API
  baseURL: "https://api.elevenlabs.io/v1",

  // Default model
  defaultModel: "eleven_monolingual_v1",

  // Check if API key is configured and valid
  isConfigured: () => {
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    return (
      apiKey &&
      apiKey !== "your_api_key_here" &&
      apiKey !== "YOUR_ELEVEN_LABS_API_KEY_HERE" &&
      apiKey !== "${ELEVEN_LABS_API_KEY}" && // Check for unsubstituted template
      apiKey.length > 10
    );
  },

  // Get API key with validation
  getApiKey: () => {
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    if (
      !apiKey ||
      apiKey === "your_api_key_here" ||
      apiKey === "YOUR_ELEVEN_LABS_API_KEY_HERE" ||
      apiKey === "${ELEVEN_LABS_API_KEY}"
    ) {
      throw new Error(
        "Eleven Labs API key not configured properly in app.json extra section."
      );
    }
    return apiKey;
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
