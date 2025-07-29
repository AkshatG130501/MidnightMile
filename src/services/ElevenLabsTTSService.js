/**
 * Eleven Labs TTS Service
 * React Native compatible implementation using direct API calls
 */

import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { ELEVEN_LABS_CONFIG } from "../config/ElevenLabsConfig";

export class ElevenLabsTTSService {
  static apiKey = null;
  static isInitialized = false;
  static baseURL = ELEVEN_LABS_CONFIG.baseURL;
  static currentSound = null; // Track current playing sound

  // Initialize from config (auto-detect API key)
  static initializeFromConfig() {
    try {
      // Debug configuration first
      const debugInfo = ELEVEN_LABS_CONFIG.debugConfig();
      console.log("🔍 ElevenLabs initialization debug:", debugInfo);

      if (!ELEVEN_LABS_CONFIG.isConfigured()) {
        console.error("❌ Eleven Labs API key not configured in app.config.js");
        console.error("- Check that ELEVEN_LABS_API_KEY is set in .env file");
        console.error("- Verify app.config.js includes the key in extra section");
        return false;
      }

      const apiKey = ELEVEN_LABS_CONFIG.getApiKey();
      console.log("✅ API key loaded successfully:", apiKey.substring(0, 8) + "...");
      return this.initialize(apiKey);
    } catch (error) {
      console.error("❌ Failed to initialize from config:", error.message);
      return false;
    }
  }

  // Initialize the Eleven Labs service
  static initialize(apiKey) {
    if (!apiKey) {
      console.error("❌ Eleven Labs API key is required");
      return false;
    }

    try {
      this.apiKey = apiKey;
      this.isInitialized = true;
      console.log("✅ Eleven Labs TTS initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize Eleven Labs TTS:", error);
      return false;
    }
  }

  // Get available voices using direct API call
  static async getVoices() {
    if (!this.isInitialized) {
      console.error("❌ Eleven Labs TTS not initialized");
      return [];
    }

    try {
      const response = await fetch(`${this.baseURL}/voices`, {
        method: "GET",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("🎤 Available voices:", data.voices?.length || 0);
      return data.voices || [];
    } catch (error) {
      console.error("❌ Failed to get voices:", error);
      return [];
    }
  }

  // Test API connection
  static async testConnection() {
    if (!this.isInitialized) {
      console.error("❌ Eleven Labs TTS not initialized");
      return false;
    }

    try {
      console.log("🧪 Testing ElevenLabs API connection...");
      
      const response = await fetch(`${this.baseURL}/user`, {
        method: "GET",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API connection test failed:");
        console.error("- Status:", response.status);
        console.error("- Response:", errorText);
        return false;
      }

      const userData = await response.json();
      console.log("✅ API connection successful!");
      console.log("- User subscription:", userData.subscription?.tier || 'Free');
      console.log("- Characters remaining:", userData.subscription?.character_count || 'Unknown');
      return true;
    } catch (error) {
      console.error("❌ API connection test error:", error);
      return false;
    }
  }

  // Convert text to speech and play it using direct API call
  static async speak(text, options = {}) {
    if (!this.isInitialized) {
      console.error("❌ Eleven Labs TTS not initialized");
      return false;
    }

    // Robust text validation
    if (!text || typeof text !== 'string') {
      console.log("⚠️ Invalid text type provided for TTS. Expected string, got:", typeof text, text);
      return false;
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      console.log("⚠️ Empty text provided for TTS");
      return false;
    }

    try {
      console.log("🗣️ Eleven Labs TTS speaking:", trimmedText);

      const defaultOptions = {
        voiceId: "EXAVITQu4vr4xnSDxMaL", // Bella - Natural, friendly female voice
        modelId: "eleven_monolingual_v1",
        voiceSettings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
        ...options,
      };

      // Prepare request body
      const requestBody = {
        text: trimmedText,
        model_id: defaultOptions.modelId,
        voice_settings: defaultOptions.voiceSettings,
      };

      // Make API call to generate speech
      const response = await fetch(
        `${this.baseURL}/text-to-speech/${defaultOptions.voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Eleven Labs TTS API Error:");
        console.error("- Status:", response.status);
        console.error("- Status Text:", response.statusText);
        console.error("- Response:", errorText);
        
        if (response.status === 401) {
          console.error("🔑 Authentication failed - check API key");
          console.error("- API key starts with 'sk_':", this.apiKey?.startsWith('sk_'));
          console.error("- API key length:", this.apiKey?.length);
        }
        
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      // Get audio data as array buffer
      const arrayBuffer = await response.arrayBuffer();

      // Convert array buffer to base64
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);

      // Save to temporary file
      const fileName = `tts_${Date.now()}.mp3`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log("🎵 TTS audio saved to:", filePath);

      // Play the audio
      await this.playAudioFile(filePath);

      return true;
    } catch (error) {
      console.error("❌ Eleven Labs TTS error:", error);
      return false;
    }
  }

  // Play audio file using expo-av
  static async playAudioFile(filePath) {
    try {
      console.log("🔊 Playing TTS audio...");

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Stop any currently playing sound
      if (this.currentSound) {
        try {
          await this.currentSound.stopAsync();
          await this.currentSound.unloadAsync();
        } catch (stopError) {
          console.log("⚠️ Error stopping previous sound:", stopError);
        }
        this.currentSound = null;
      }

      // Create and play sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: filePath },
        { shouldPlay: true, volume: 1.0 }
      );

      // Track current sound
      this.currentSound = sound;

      // Monitor playback
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            console.log("✅ TTS playback finished");
            // Clean up the sound and temporary file
            sound.unloadAsync();
            this.cleanupTempFile(filePath);
            // Clear current sound reference
            if (this.currentSound === sound) {
              this.currentSound = null;
            }
          }
        } else if (status.error) {
          console.error("❌ TTS playback error:", status.error);
          // Clear current sound reference on error
          if (this.currentSound === sound) {
            this.currentSound = null;
          }
        }
      });

      return sound;
    } catch (error) {
      console.error("❌ Audio playback error:", error);
      this.cleanupTempFile(filePath);
      throw error;
    }
  }

  // Clean up temporary audio files
  static async cleanupTempFile(filePath) {
    try {
      const fileExists = await FileSystem.getInfoAsync(filePath);
      if (fileExists.exists) {
        await FileSystem.deleteAsync(filePath);
        console.log("🗑️ Cleaned up TTS temp file");
      }
    } catch (error) {
      console.log("⚠️ Could not clean up temp file:", error.message);
    }
  }

  // Test TTS functionality
  static async testTTS() {
    if (!this.isInitialized) {
      console.error("❌ Eleven Labs TTS not initialized");
      return false;
    }

    try {
      console.log("🧪 Testing Eleven Labs TTS...");
      await this.speak(
        "Hello! This is a test of Eleven Labs text to speech for Midnight Mile."
      );
      return true;
    } catch (error) {
      console.error("❌ TTS test failed:", error);
      return false;
    }
  }

  // Stop current speech
  static async stop() {
    try {
      if (this.currentSound) {
        console.log("🔇 Stopping current TTS playback...");
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
        this.currentSound = null;
        console.log("✅ TTS playback stopped");
      }
    } catch (error) {
      console.error("❌ Error stopping TTS:", error);
      this.currentSound = null; // Reset anyway
    }
  }

  // Cleanup all resources
  static cleanup() {
    console.log("🧹 Cleaning up Eleven Labs TTS...");
    
    // Stop any current playback
    if (this.currentSound) {
      try {
        this.currentSound.stopAsync();
        this.currentSound.unloadAsync();
      } catch (error) {
        console.log("⚠️ Error during cleanup stop:", error);
      }
      this.currentSound = null;
    }
    
    this.isInitialized = false;
    this.apiKey = null;
  }
}

// Predefined voice options for easy selection
export const ELEVEN_LABS_VOICES = {
  BELLA: "VPF8D2whCW2BL8tFWO6e", // Natural, friendly female
  RACHEL: "21m00Tcm4TlvDq8ikWAM", // Calm, confident female
  DOMI: "AZnzlk1XvdvUeBnXmlld", // Strong, confident female
  DAVE: "CYw3kZ02Hs0563khs1Fj", // Professional male
  ANTONI: "ErXwobaYiN019PkySvjV", // Smooth, calm male
  ARNOLD: "VR6AewLTigWG4xSOukaG", // Deep, authoritative male
};

// Voice settings presets
export const VOICE_SETTINGS = {
  NATURAL: {
    stability: 0.5,
    similarity_boost: 0.8,
    style: 0.0,
    use_speaker_boost: true,
  },
  CALM: {
    stability: 0.7,
    similarity_boost: 0.6,
    style: 0.2,
    use_speaker_boost: true,
  },
  EXCITED: {
    stability: 0.3,
    similarity_boost: 0.9,
    style: 0.5,
    use_speaker_boost: true,
  },
  SAFETY: {
    stability: 0.8,
    similarity_boost: 0.7,
    style: 0.1,
    use_speaker_boost: true,
  },
};
