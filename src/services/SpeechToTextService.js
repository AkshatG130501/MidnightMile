/**
 * Speech-to-Text Service using ElevenLabs Speech-to-Text API
 * Converts audio recordings to text for AI processing
 */

import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { ELEVEN_LABS_CONFIG } from "../config/ElevenLabsConfig";

export class SpeechToTextService {
  static apiKey = null;
  static isInitialized = false;
  static baseURL = "https://api.elevenlabs.io/v1/speech-to-text";

  // Initialize the service with ElevenLabs API key
  static initialize() {
    try {
      // Debug configuration first
      const debugInfo = ELEVEN_LABS_CONFIG.debugConfig();
      console.log("🔍 ElevenLabs STT initialization debug:", debugInfo);

      if (!ELEVEN_LABS_CONFIG.isConfigured()) {
        console.error("❌ ElevenLabs API key not configured in app.config.js");
        console.error("- Check that ELEVEN_LABS_API_KEY is set in .env file");
        console.error("- Verify app.config.js includes the key in extra section");
        return false;
      }

      const apiKey = ELEVEN_LABS_CONFIG.getApiKey();
      console.log("✅ ElevenLabs STT API key loaded successfully:", apiKey.substring(0, 8) + "...");
      
      this.apiKey = apiKey;
      this.isInitialized = true;
      console.log("✅ ElevenLabs Speech-to-Text service initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize ElevenLabs Speech-to-Text service:", error);
      return false;
    }
  }

  // Convert audio file to text using ElevenLabs
  static async transcribeAudio(audioUri) {
    if (!this.isInitialized) {
      console.error("❌ ElevenLabs Speech-to-Text service not initialized");
      return null;
    }

    try {
      console.log("🎤 Starting ElevenLabs audio transcription...");

      // Read the audio file
      const audioInfo = await FileSystem.getInfoAsync(audioUri);
      console.log("📁 Audio file info:", {
        exists: audioInfo.exists,
        size: audioInfo.size,
        uri: audioInfo.uri,
        modificationTime: audioInfo.modificationTime
      });

      if (!audioInfo.exists) {
        console.error("❌ Audio file does not exist:", audioUri);
        return null;
      }

      if (audioInfo.size === 0) {
        console.error("❌ Audio file is empty:", audioUri);
        return null;
      }

      // Create FormData for file upload
      const formData = new FormData();
      
      // Determine the appropriate MIME type based on platform
      let mimeType = 'audio/webm';
      let fileName = 'recording.webm';
      
      if (Platform.OS === 'ios') {
        mimeType = 'audio/mp4';
        fileName = 'recording.m4a';
      } else if (Platform.OS === 'android') {
        mimeType = 'audio/mp4';
        fileName = 'recording.mp4';
      }
      
      // Add the audio file
      formData.append('file', {
        uri: audioUri,
        type: mimeType,
        name: fileName,
      });

      // Add required model_id parameter (use scribe_v1 which is the standard model)
      formData.append('model_id', 'scribe_v1');

      // Optional parameters for better transcription
      formData.append('language_code', 'en');
      formData.append('tag_audio_events', 'false');
      formData.append('timestamps_granularity', 'word');

      // Make the API request
      console.log("🌐 Making ElevenLabs STT API request...");
      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          // Don't set Content-Type, let the browser set it for FormData
        },
        body: formData,
      });

      console.log("📡 ElevenLabs STT response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ ElevenLabs STT API error:", response.status, errorText);
        
        // Parse error response if it's JSON
        try {
          const errorJson = JSON.parse(errorText);
          console.error("🔍 Detailed error:", errorJson);
        } catch (e) {
          // Error text is not JSON, log as is
        }
        
        throw new Error(`ElevenLabs STT API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("🔍 ElevenLabs STT response:", result);

      // Extract the transcribed text
      if (result.text) {
        const transcript = result.text.trim();
        console.log("✅ ElevenLabs transcription successful:", transcript);
        return transcript;
      } else {
        console.log("⚠️ No speech detected in audio");
        return null;
      }
    } catch (error) {
      console.error("❌ ElevenLabs transcription error:", error);
      return null;
    }
  }

  // Alternative transcription method using base64 encoding
  static async transcribeWithBase64(audioUri) {
    try {
      console.log("🔄 Trying ElevenLabs transcription with base64...");

      // Note: Base64 method may not be supported, keeping as fallback
      // The primary method should work with FormData file upload
      
      console.log("⚠️ Base64 method may not be supported by ElevenLabs STT API");
      console.log("📝 Recommend using the primary FormData file upload method");
      
      return null;
    } catch (error) {
      console.error("❌ ElevenLabs base64 transcription error:", error);
      return null;
    }
  }

  // Test the service connectivity
  static async testConnection() {
    if (!this.isInitialized) {
      return false;
    }

    try {
      // Test with a simple request to see if API key is valid
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        method: "GET",
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      // If we can access voices, the API key is valid
      const isValid = response.status === 200;
      console.log("🔗 ElevenLabs STT connection test:", isValid ? "✅ Success" : "❌ Failed");
      return isValid;
    } catch (error) {
      console.error("❌ ElevenLabs STT connection test failed:", error);
      return false;
    }
  }

  // Get service status
  static getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasApiKey: !!this.apiKey,
      apiKeyPreview: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : null,
      provider: "ElevenLabs",
    };
  }

  // Cleanup resources
  static cleanup() {
    this.apiKey = null;
    this.isInitialized = false;
    console.log("🧹 ElevenLabs Speech-to-Text service cleaned up");
  }
}
