/**
 * AI Companion Service
 * Handles TTS, STT, and conversational AI features for the Midnight Mile app
 */

import { Audio } from "expo-av";
import { Alert, Platform, Linking } from "react-native";
import {
  ElevenLabsTTSService,
  ELEVEN_LABS_VOICES,
  VOICE_SETTINGS,
} from "./ElevenLabsTTSService";
import { ELEVEN_LABS_CONFIG } from "../config/ElevenLabsConfig";
import { IntelligentAIService } from "./IntelligentAIService";

export class AICompanionService {
  static isListening = false;
  static isRecording = false;
  static recording = null;
  static conversationTimer = null;
  static safetyCheckTimer = null;
  static navigationSpeakTimer = null;
  static lastLocationUpdate = null;
  static locationStationaryTime = 0;
  static hasGreetedLocation = false;
  static lastConversationTopic = null;
  static conversationHistory = [];
  static navigationSpeakCount = 0;
  static lastSpokenLocation = null; // Track location for anti-repetition
  static lastNavigationInstruction = null; // Track last navigation instruction given
  static navigationInstructionLocations = new Map(); // Track instructions per location
  static isSpeaking = false; // Track if AI is currently speaking
  static speechQueue = []; // Queue for speech to prevent conflicts
  static isPausedForRecording = false; // Flag to pause all AI speech during user recording

  // Checkpoint-based navigation system
  static routeCheckpoints = []; // Array of route checkpoints
  static currentCheckpointIndex = 0; // Current checkpoint we're at
  static checkpointCompleted = new Set(); // Track completed checkpoints
  static lastCheckpointTime = null; // Time of last checkpoint
  static routeCoordinates = []; // Full route coordinates
  static checkpointDistance = 500; // Distance between checkpoints in meters

  static context = {
    currentLocation: null,
    selectedRoute: null,
    nextTurn: null,
    routeProgress: 0,
    isNavigating: false,
    nearbySpots: [],
    safetyLevel: "safe",
    locationName: null,
    nearbyPlaces: [],
    weatherInfo: null,
    timeOfDay: null,
  };

  // Initialize the AI companion
  static async initialize() {
    try {
      console.log("🤖 Initializing AI Companion...");

      // Initialize Intelligent AI Service
      const aiInitialized = IntelligentAIService.initialize();
      if (aiInitialized) {
        console.log("✅ Intelligent AI Service initialized");
      } else {
        console.log(
          "⚠️ Intelligent AI Service not available, using fallback responses"
        );
      }

      // Initialize Eleven Labs TTS if API key is available
      if (ELEVEN_LABS_CONFIG.isConfigured()) {
        try {
          const ttsInitialized = ElevenLabsTTSService.initializeFromConfig();
          if (ttsInitialized) {
            console.log("✅ Eleven Labs TTS initialized successfully");

            // Test the connection to verify the API key works
            const connectionTest = await ElevenLabsTTSService.testConnection();
            if (connectionTest) {
              console.log("✅ Eleven Labs API connection verified");
            } else {
              console.log("⚠️ Eleven Labs API connection test failed");
            }
          } else {
            console.log(
              "⚠️ Eleven Labs TTS initialization failed, but continuing..."
            );
          }
        } catch (error) {
          console.log("⚠️ Eleven Labs TTS not configured:", error.message);
        }
      } else {
        console.log(
          "⚠️ Eleven Labs API key not configured, TTS will be skipped"
        );
      }

      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("❌ Audio permission denied");
        Alert.alert(
          "Permission Required",
          "Microphone access is needed for the AI companion voice features. Please enable it in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Settings",
              onPress: () => {
                // On iOS, this will prompt user to go to settings
                if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                }
              },
            },
          ]
        );
        return false;
      }
      console.log("✅ Audio permission granted");

      console.log("✅ AI Companion initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ AI Companion initialization failed:", error);
      Alert.alert(
        "AI Companion Error",
        "Failed to initialize AI companion. Voice features may not work properly."
      );
      return false;
    }
  }

  // Update context information for the AI
  static updateContext(newContext) {
    const previousLocation = this.context.currentLocation;
    const wasNavigating = this.context.isNavigating;
    this.context = { ...this.context, ...newContext };

    // Check if navigation just started
    if (!wasNavigating && newContext.isNavigating) {
      this.startNavigation();
    }

    // Check if navigation just stopped
    if (wasNavigating && newContext.isNavigating === false) {
      this.stopNavigation();
    }

    // Initialize route checkpoints when route is provided
    if (newContext.selectedRoute && !this.routeCheckpoints.length) {
      this.initializeRouteCheckpoints(newContext.selectedRoute);
    }

    // Check checkpoint progress during navigation
    if (
      newContext.isNavigating &&
      newContext.currentLocation &&
      this.routeCheckpoints.length > 0
    ) {
      this.checkCheckpointProgress(newContext.currentLocation);
    }

    // Check if location has changed
    if (newContext.currentLocation && previousLocation) {
      const distance = this.calculateDistance(
        previousLocation.latitude,
        previousLocation.longitude,
        newContext.currentLocation.latitude,
        newContext.currentLocation.longitude
      );

      // If user has moved more than 50 meters, reset stationary time
      if (distance > 0.05) {
        // 50 meters
        this.locationStationaryTime = 0;
        this.lastLocationUpdate = Date.now();
        this.hasGreetedLocation = false; // Allow new location greeting
      }
    }

    // Update last location time
    if (newContext.currentLocation) {
      if (!this.lastLocationUpdate) {
        this.lastLocationUpdate = Date.now();
      }
    }

    // Only log context updates during navigation or significant changes
    if (
      newContext.isNavigating ||
      !wasNavigating !== !newContext.isNavigating
    ) {
      console.log("🧠 AI Context updated:", {
        isNavigating: this.context.isNavigating,
        hasRoute: !!this.context.selectedRoute,
        locationChanged: !!newContext.currentLocation,
        nearbySpots: this.context.nearbySpots?.length || 0,
      });
    }

    // Start proactive conversations if listening
    if (this.isListening) {
      this.startProactiveConversation();
    }
  }

  // Speak text using Eleven Labs TTS with queue management
  static async speak(text, options = {}) {
    try {
      // Check if AI speech is paused for recording
      if (
        this.isPausedForRecording &&
        options.priority !== "recording-response"
      ) {
        console.log(
          "⏸️ AI speech paused for recording, skipping:",
          text.substring(0, 50) + "..."
        );
        return;
      }

      // Robust text validation - check for Promise objects specifically
      if (text && typeof text === "object" && typeof text.then === "function") {
        console.error(
          "❌ Promise object passed to speak method. This indicates a missing 'await' keyword."
        );
        console.error("Promise object:", text);
        return;
      }

      // Standard text validation
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        console.log(
          "⚠️ No valid text provided for TTS. Received:",
          typeof text,
          text
        );
        return;
      }

      // Check if Eleven Labs TTS is initialized
      if (!ElevenLabsTTSService.isInitialized) {
        console.log("⚠️ Eleven Labs TTS not initialized, skipping speech");
        return;
      }

      const defaultOptions = {
        voiceId: ELEVEN_LABS_VOICES?.BELLA || "EXAVITQu4vr4xnSDxMaL", // Natural, friendly female voice
        voiceSettings: VOICE_SETTINGS?.NATURAL || {
          stability: 0.5,
          similarityBoost: 0.8,
          style: 0.0,
          speakerBoost: true,
        },
        priority: options.priority || "normal", // 'high', 'normal', 'low', 'recording-response'
        ...options,
      };

      // Handle priority speech (interrupts current speech)
      if (
        defaultOptions.priority === "high" ||
        defaultOptions.priority === "recording-response"
      ) {
        await this.stopAllSpeaking();
        this.speechQueue = []; // Clear queue for high priority
      }

      // Add to speech queue
      return new Promise((resolve) => {
        this.speechQueue.push({
          text,
          options: defaultOptions,
          resolve,
        });

        // Process queue if not currently speaking
        if (!this.isSpeaking) {
          this.processSpeechQueue();
        }
      });
    } catch (error) {
      console.error("❌ Eleven Labs TTS error:", error);
    }
  }

  // Process speech queue to prevent overlapping voices
  static async processSpeechQueue() {
    if (this.isSpeaking || this.speechQueue.length === 0) {
      return;
    }

    this.isSpeaking = true;
    const { text, options, resolve } = this.speechQueue.shift();

    try {
      console.log("🗣️ AI Speaking with Eleven Labs:", text);

      // Use Eleven Labs TTS
      const success = await ElevenLabsTTSService.speak(text, options);

      if (!success) {
        console.log("⚠️ Eleven Labs TTS failed, skipping speech");
      }

      resolve(success);
    } catch (error) {
      console.error("❌ Speech processing error:", error);
      resolve(false);
    } finally {
      this.isSpeaking = false;

      // Process next item in queue after a small delay
      setTimeout(() => {
        this.processSpeechQueue();
      }, 100);
    }
  }

  // Stop all speaking and clear queue
  static async stopAllSpeaking() {
    try {
      console.log("🔇 Stopping all AI speech...");

      // Stop current TTS
      if (ElevenLabsTTSService.isInitialized) {
        ElevenLabsTTSService.stop();
      }

      // Clear speech queue
      this.speechQueue = [];
      this.isSpeaking = false;
    } catch (error) {
      console.error("❌ Stop all speaking error:", error);
    }
  }

  // Pause AI speech during user recording/interaction
  static pauseAISpeechForRecording() {
    console.log("⏸️ Pausing AI speech for user recording...");
    this.isPausedForRecording = true;

    // Stop any current speech immediately
    this.stopAllSpeaking();

    // Clear any pending timers to prevent new speech
    if (this.conversationTimer) {
      clearInterval(this.conversationTimer);
      this.conversationTimer = null;
    }

    if (this.navigationSpeakTimer) {
      clearInterval(this.navigationSpeakTimer);
      this.navigationSpeakTimer = null;
    }
  }

  // Resume AI speech after user recording/interaction is complete
  static resumeAISpeechAfterRecording() {
    console.log("▶️ Resuming AI speech after user recording...");
    this.isPausedForRecording = false;

    // Restart conversation and navigation timers if listening
    if (this.isListening) {
      this.startProactiveConversation();

      // Restart navigation speaking if currently navigating
      if (this.context.isNavigating) {
        this.startNavigationSpeaking();
      }
    }
  }

  // Initialize AI companion with Eleven Labs
  static async initializeWithElevenLabs(apiKey) {
    try {
      console.log("🤖 Initializing AI Companion with Eleven Labs...");

      // Initialize Eleven Labs TTS using the config method
      const ttsInitialized = ElevenLabsTTSService.initializeFromConfig();
      if (!ttsInitialized) {
        console.error("❌ Failed to initialize Eleven Labs TTS");
        return false;
      }

      // Test the API connection
      const connectionTest = await ElevenLabsTTSService.testConnection();
      if (!connectionTest) {
        console.error("❌ Eleven Labs API connection test failed");
        return false;
      }

      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("❌ Audio permission denied");
        Alert.alert(
          "Permission Required",
          "Microphone access is needed for the AI companion voice features. Please enable it in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Settings",
              onPress: () => {
                if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                }
              },
            },
          ]
        );
        return false;
      }
      console.log("✅ Audio permission granted");

      console.log("✅ AI Companion with Eleven Labs initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ AI Companion initialization failed:", error);
      Alert.alert(
        "AI Companion Error",
        "Failed to initialize AI companion. Voice features may not work properly."
      );
      return false;
    }
  }

  // Start voice activation mode
  static async startListening() {
    try {
      if (this.isListening) {
        console.log("👂 Already listening...");
        return;
      }

      console.log("👂 Starting voice listening...");
      this.isListening = true;

      // Start the conversation and safety monitoring
      this.startProactiveConversation();
      this.startSafetyMonitoring();

      // Initial greeting
      await this.speak(
        "Hi there! I'm your AI travel companion. I'll keep you company, help with directions, and share interesting things about your journey. Ready to explore together?"
      );

      return true;
    } catch (error) {
      console.error("❌ Start listening error:", error);
      this.isListening = false;
      return false;
    }
  }

  // Stop voice activation
  static async stopListening() {
    try {
      console.log("🔇 Stopping voice listening...");
      this.isListening = false;

      // Stop all speaking immediately
      await this.stopAllSpeaking();

      // Clear timers
      if (this.conversationTimer) {
        clearInterval(this.conversationTimer);
        this.conversationTimer = null;
      }

      if (this.safetyCheckTimer) {
        clearInterval(this.safetyCheckTimer);
        this.safetyCheckTimer = null;
      }

      if (this.navigationSpeakTimer) {
        clearInterval(this.navigationSpeakTimer);
        this.navigationSpeakTimer = null;
      }

      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
    } catch (error) {
      console.error("❌ Stop listening error:", error);
    }
  }

  // Record audio for STT (no audio mode configuration)
  static async startRecording() {
    try {
      if (this.isRecording) {
        console.log("🎤 Already recording...");
        return;
      }

      console.log("🎤 Starting recording...");

      // Skip audio mode configuration - let expo-av use defaults
      this.isRecording = true;

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      console.log("✅ Recording started successfully");
      return recording;
    } catch (error) {
      console.error("❌ Recording error:", error);
      this.isRecording = false;
      return null;
    }
  }

  static async stopRecording() {
    try {
      if (!this.isRecording || !this.recording) {
        console.log("🎤 No active recording...");
        return null;
      }

      console.log("🎤 Stopping recording...");
      await this.recording.stopAndUnloadAsync();

      const uri = this.recording.getURI();
      this.recording = null;
      this.isRecording = false;

      console.log("✅ Recording stopped. URI:", uri);

      // Simulate STT processing
      console.log("🧠 Processing speech...");
      await this.speak("I heard you! Let me process what you said.");

      // For now, return a simulated response
      setTimeout(async () => {
        const response = await this.generateContextualResponse("user spoke");
        await this.speak(response);
      }, 1000);

      return uri;
    } catch (error) {
      console.error("❌ Stop recording error:", error);
      this.isRecording = false;
      return null;
    }
  }

  // Generate contextual responses based on current situation
  static async generateContextualResponse(userInput = "") {
    const {
      currentLocation,
      selectedRoute,
      nextTurn,
      routeProgress,
      isNavigating,
      nearbySpots,
      locationName,
      nearbyPlaces,
      safetyLevel,
      timeOfDay,
    } = this.context;

    try {
      // Use intelligent AI service to generate response
      const response = await IntelligentAIService.generateResponse(userInput, {
        currentLocation,
        locationName,
        isNavigating,
        nextTurn,
        routeProgress,
        nearbyPlaces,
        nearbySpots,
        safetyLevel,
        timeOfDay,
      });

      // Validate response is a non-empty string
      if (
        response &&
        typeof response === "string" &&
        response.trim().length > 0
      ) {
        return response.trim();
      } else {
        console.log("⚠️ Invalid response from AI service, using fallback");
        return this.getFallbackResponse(userInput);
      }
    } catch (error) {
      console.error("❌ Error generating intelligent response:", error);

      // Fallback to hardcoded responses if intelligent service fails
      return this.getFallbackResponse(userInput);
    }
  }

  // Fallback response method (simplified from original logic)
  static getFallbackResponse(userInput = "") {
    const {
      currentLocation,
      selectedRoute,
      nextTurn,
      routeProgress,
      isNavigating,
      nearbySpots,
      locationName,
    } = this.context;

    // Handle specific user inputs first
    if (
      userInput.toLowerCase().includes("help") ||
      userInput.toLowerCase().includes("scared")
    ) {
      return "I'm here with you, and you're not alone. If you feel unsafe, I can help you find the nearest safe location or contact emergency services. What do you need right now?";
    }

    if (
      userInput.toLowerCase().includes("directions") ||
      userInput.toLowerCase().includes("turn")
    ) {
      if (nextTurn) {
        return `Your next turn is ${nextTurn.instruction} in ${nextTurn.distance}. I'll keep you updated as we go along this route.`;
      } else {
        return "You don't have an active route right now. Would you like to set a destination? I can help guide you there!";
      }
    }

    if (
      userInput.toLowerCase().includes("safe") ||
      userInput.toLowerCase().includes("okay")
    ) {
      return "I'm so glad you're safe! I'm constantly monitoring your journey and I'm here whenever you need me. How can I help make your trip even better?";
    }

    // Context-based responses for navigation
    if (isNavigating && nextTurn) {
      return `You're doing fantastic! In about ${nextTurn.distance}, ${nextTurn.instruction}. I'm enjoying keeping you company on this journey.`;
    }

    if (isNavigating && routeProgress > 80) {
      return "You're almost at your destination! Just a little further. I've really enjoyed our conversation along the way!";
    }

    // Default friendly responses
    const defaultResponses = [
      "I'm here to keep you company and help with whatever you need. What's on your mind?",
      "You're doing great! I'm monitoring your journey and I'm here if you need anything. Want to chat about something?",
      "Everything looks good from here. I'm keeping an eye on your route and safety. How are you feeling about the trip?",
      "How's everything going? I love being your travel companion - there's always something interesting to talk about!",
    ];

    return defaultResponses[
      Math.floor(Math.random() * defaultResponses.length)
    ];
  }

  // Provide proactive navigation assistance
  static async provideNavigationUpdate() {
    if (!this.isListening || !this.context.isNavigating) {
      return;
    }

    const { routeProgress, nextTurn, locationName } = this.context;

    // Provide turn-by-turn directions with friendly context
    if (nextTurn) {
      const distance = parseInt(nextTurn.distance) || 0;

      // Check if we've already given this instruction for this location
      if (this.hasGivenNavigationInstructionForLocation(nextTurn.instruction)) {
        console.log(
          "🔇 Skipping repeated navigation instruction for same location"
        );
        return;
      }

      if (distance <= 200 && distance > 100) {
        await this.speak(
          `Coming up in ${nextTurn.distance}, ${nextTurn.instruction}. I'll let you know when we're closer!`
        );
      } else if (distance <= 100 && distance > 50) {
        await this.speak(
          `Get ready! In ${nextTurn.distance}, ${nextTurn.instruction}.`
        );
      } else if (distance <= 50) {
        await this.speak(`${nextTurn.instruction} right now!`);
      }
    }

    // Provide updates at key milestones with location context
    if (routeProgress === 25) {
      const message = locationName
        ? `You're a quarter of the way there! We're passing through ${locationName} - looking good so far!`
        : "You're a quarter of the way there. Keep going, you're doing great!";
      await this.speak(message);
    } else if (routeProgress === 50) {
      await this.speak(
        "Halfway point reached! You're making excellent progress. How are you feeling about the journey?"
      );
    } else if (routeProgress === 75) {
      await this.speak(
        "Three quarters complete! Almost there, stay strong! The end is in sight."
      );
    } else if (routeProgress >= 90) {
      await this.speak(
        "You're almost at your destination! Just a little bit further. You've done amazing!"
      );
    }
  }

  // Proactive turn-by-turn assistance
  static async provideUpcomingTurnAlert(turnData) {
    if (!this.isListening || !turnData) return;

    // Check if we've already given this instruction for this location
    if (this.hasGivenNavigationInstructionForLocation(turnData.instruction)) {
      console.log("🔇 Skipping repeated turn alert for same location");
      return;
    }

    const distance = parseInt(turnData.distance);
    if (distance <= 100 && distance > 50) {
      await this.speak(
        `In ${turnData.distance}, ${turnData.instruction}. Get ready.`
      );
    } else if (distance <= 50) {
      await this.speak(`${turnData.instruction} now.`);
    }
  }

  // Check for nearby safety concerns
  static async checkSafetyStatus() {
    if (!this.isListening) return;

    const { nearbySpots, currentLocation } = this.context;

    // Check if user is near safe locations
    const policeNearby = nearbySpots.find((spot) => spot.type === "police");
    const hospitalNearby = nearbySpots.find((spot) => spot.type === "hospital");

    // Time-based safety checks
    const hour = new Date().getHours();

    if (hour >= 22 || hour <= 6) {
      // Night time
      if (policeNearby) {
        await this.speak(
          "I notice it's late. Just so you know, there's a police station nearby for your safety."
        );
      } else {
        await this.speak(
          "I'm keeping extra watch since it's nighttime. You're doing great, stay aware of your surroundings."
        );
      }
    }
  }

  // Emergency assistance
  static async handleEmergency() {
    await this.speak(
      "I'm activating emergency assistance. Help is on the way. Stay calm, you're going to be okay."
    );
  }

  // Safety check-in
  static async performSafetyCheckIn() {
    if (!this.isListening) return;

    const checkInMessages = [
      "How are you feeling? I'm here if you need anything.",
      "Just checking in - you're doing great! Everything okay?",
      "I'm still here with you. How's your journey going?",
      "Safety check - you're being tracked and you're safe. All good?",
    ];

    const message =
      checkInMessages[Math.floor(Math.random() * checkInMessages.length)];
    await this.speak(message);
  }

  // Clean up resources
  static async cleanup() {
    try {
      console.log("🧹 Cleaning up AI Companion...");

      // Stop all speaking immediately
      await this.stopAllSpeaking();

      // Clear all timers
      if (this.conversationTimer) {
        clearInterval(this.conversationTimer);
        this.conversationTimer = null;
      }

      if (this.safetyCheckTimer) {
        clearInterval(this.safetyCheckTimer);
        this.safetyCheckTimer = null;
      }

      if (this.navigationSpeakTimer) {
        clearInterval(this.navigationSpeakTimer);
        this.navigationSpeakTimer = null;
      }

      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }

      // Cleanup Eleven Labs TTS
      ElevenLabsTTSService.cleanup();

      // Reset all state including checkpoint system
      this.isListening = false;
      this.isRecording = false;
      this.hasGreetedLocation = false;
      this.lastConversationTopic = null;
      this.conversationHistory = [];
      this.navigationSpeakCount = 0;
      this.lastSpokenLocation = null;
      this.lastNavigationInstruction = null;
      this.navigationInstructionLocations.clear();
      this.isSpeaking = false;
      this.speechQueue = [];

      // Reset checkpoint state
      this.routeCheckpoints = [];
      this.currentCheckpointIndex = 0;
      this.checkpointCompleted.clear();
      this.lastCheckpointTime = null;
      this.routeCoordinates = [];
    } catch (error) {
      console.error("❌ Cleanup error:", error);
    }
  }

  // Start proactive conversation system
  static startProactiveConversation() {
    if (this.conversationTimer) {
      clearInterval(this.conversationTimer);
    }

    // Start conversations every 45-90 seconds
    this.conversationTimer = setInterval(() => {
      if (this.isListening) {
        this.initiateConversation();
      }
    }, this.getRandomInterval(45000, 90000)); // 45-90 seconds
  }

  // Start safety monitoring system
  static startSafetyMonitoring() {
    if (this.safetyCheckTimer) {
      clearInterval(this.safetyCheckTimer);
    }

    // Check safety every 30 seconds
    this.safetyCheckTimer = setInterval(() => {
      if (this.isListening) {
        this.performSafetyCheck();
      }
    }, 30000); // 30 seconds
  }

  // Initiate contextual conversation
  static async initiateConversation() {
    try {
      const {
        currentLocation,
        isNavigating,
        nextTurn,
        routeProgress,
        locationName,
        nearbyPlaces,
      } = this.context;

      // Priority 1: Navigation updates
      if (isNavigating && nextTurn) {
        await this.provideNavigationUpdate();
        return;
      }

      // Priority 2: Location-based conversation
      if (currentLocation && !this.hasGreetedLocation) {
        await this.shareLocationInfo();
        this.hasGreetedLocation = true;
        return;
      }

      // Priority 3: Intelligent contextual topics
      const topic = await this.selectConversationTopic();
      if (topic) {
        await this.speak(topic);
        this.conversationHistory.push({
          topic: this.lastConversationTopic,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error("❌ Conversation initiation error:", error);
    }
  }

  // Share information about current location
  static async shareLocationInfo() {
    const { locationName, nearbyPlaces, currentLocation } = this.context;

    try {
      // Get time-based greeting
      const timeGreeting = this.getTimeBasedGreeting();

      // Location-specific information
      if (locationName) {
        const locationInfo = this.getLocationInfo(locationName);
        await this.speak(
          `${timeGreeting} We're in ${locationName}. ${locationInfo}`
        );
      } else if (currentLocation) {
        await this.speak(
          `${timeGreeting} This looks like a nice area! I'm checking what interesting places are around here.`
        );
      }

      // Share nearby places after a short delay
      setTimeout(async () => {
        if (this.isListening) {
          await this.shareNearbyPlaces();
        }
      }, 3000);
    } catch (error) {
      console.error("❌ Share location info error:", error);
    }
  }

  // Share nearby places and food options
  static async shareNearbyPlaces() {
    const { nearbyPlaces, nearbySpots } = this.context;

    try {
      // Combine nearby places with safe spots
      const allPlaces = [...(nearbyPlaces || []), ...(nearbySpots || [])];

      if (allPlaces.length === 0) {
        await this.speak(
          "I'm still discovering what's around here. This area seems peaceful and quiet."
        );
        return;
      }

      // Categorize places
      const restaurants = allPlaces.filter(
        (place) =>
          place.type?.includes("restaurant") ||
          place.type?.includes("food") ||
          place.category?.includes("dining")
      );

      const cafes = allPlaces.filter(
        (place) =>
          place.type?.includes("cafe") ||
          place.name?.toLowerCase().includes("coffee") ||
          place.name?.toLowerCase().includes("cafe")
      );

      const landmarks = allPlaces.filter(
        (place) =>
          place.type?.includes("tourist") ||
          place.type?.includes("landmark") ||
          place.category?.includes("attraction")
      );

      // Share food options
      if (restaurants.length > 0) {
        const restaurant = restaurants[0];
        await this.speak(
          `If you're getting hungry, there's ${restaurant.name} nearby. It looks like a great spot for a meal!`
        );
      } else if (cafes.length > 0) {
        const cafe = cafes[0];
        await this.speak(
          `I spotted ${cafe.name} around here. Perfect if you need a coffee break or quick snack!`
        );
      }

      // Share interesting landmarks
      if (landmarks.length > 0) {
        setTimeout(async () => {
          if (this.isListening) {
            const landmark = landmarks[0];
            await this.speak(
              `Oh, and there's ${landmark.name} in this area. That's pretty cool! This neighborhood has some character.`
            );
          }
        }, 4000);
      }
    } catch (error) {
      console.error("❌ Share nearby places error:", error);
    }
  }

  // Get conversation topic based on context
  static async selectConversationTopic() {
    const {
      currentLocation,
      isNavigating,
      routeProgress,
      nearbySpots,
      timeOfDay,
      locationName,
      nearbyPlaces,
      safetyLevel,
      lastConversationTime,
    } = this.context;

    try {
      // Use intelligent AI service to generate a proactive conversation starter
      const topic = await IntelligentAIService.generateConversationTopic({
        currentLocation,
        locationName,
        isNavigating,
        routeProgress,
        nearbyPlaces,
        nearbySpots,
        safetyLevel,
        timeOfDay,
        lastConversationTime,
      });

      // Validate topic is a non-empty string
      if (topic && typeof topic === "string" && topic.trim().length > 0) {
        // Store topic key for history tracking
        this.lastConversationTopic = topic.substring(0, 20);
        return topic.trim();
      } else {
        console.log(
          "⚠️ Invalid topic returned from AI service, using fallback"
        );
        return this.getFallbackConversationTopic();
      }
    } catch (error) {
      console.error(
        "❌ Error generating intelligent conversation topic:",
        error
      );

      // Fallback to original logic
      return this.getFallbackConversationTopic();
    }
  }

  // Fallback conversation topic selection
  static getFallbackConversationTopic() {
    const {
      currentLocation,
      isNavigating,
      routeProgress,
      nearbySpots,
      timeOfDay,
    } = this.context;

    const topics = [];

    // Navigation-related topics
    if (isNavigating) {
      if (routeProgress < 25) {
        topics.push(
          "How are you feeling about the journey so far? The route looks good ahead."
        );
        topics.push(
          "I'm keeping an eye on traffic and safety conditions for you. Everything's looking smooth!"
        );
      } else if (routeProgress > 75) {
        topics.push(
          "We're almost there! You've done great on this trip. How are you feeling?"
        );
        topics.push(
          "Just a little bit more to go! I hope you've enjoyed our conversation along the way."
        );
      } else {
        topics.push(
          "We're making great progress! Is there anything you'd like to know about the area we're passing through?"
        );
        topics.push(
          "How's the drive going? I'm here if you want to chat about anything."
        );
      }
    }

    // Time-based topics
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      topics.push(
        "Beautiful morning for a journey! I love how the morning light makes everything look fresh."
      );
      topics.push(
        "Hope you had a good breakfast! Morning travels are some of my favorites."
      );
    } else if (hour >= 12 && hour < 17) {
      topics.push(
        "Perfect afternoon for being out and about! The weather seems nice for traveling."
      );
      topics.push(
        "Afternoon adventures are the best! How has your day been so far?"
      );
    } else if (hour >= 17 && hour < 22) {
      topics.push(
        "Evening travels have their own charm, don't they? The day is winding down nicely."
      );
      topics.push(
        "I love the golden hour lighting at this time of day. Perfect for a peaceful journey."
      );
    } else {
      topics.push(
        "It's pretty quiet out here at night. I'm keeping extra watch to make sure you're safe."
      );
      topics.push(
        "Night driving can be peaceful. I'm here to keep you company and alert."
      );
    }

    // Safety-related positive topics
    if (nearbySpots.some((spot) => spot.type === "police")) {
      topics.push(
        "I noticed there are police stations in this area. Always good to know we're in a well-monitored neighborhood!"
      );
    }

    if (nearbySpots.some((spot) => spot.type === "hospital")) {
      topics.push(
        "This area has good medical facilities nearby. It's always reassuring to be in well-serviced areas."
      );
    }

    // General conversation topics
    topics.push(
      "What's your favorite type of music for road trips? I'd love to know what keeps you energized!"
    );
    topics.push(
      "Do you often travel this route, or is this somewhere new for you?"
    );
    topics.push(
      "I'm always curious about people's travel stories. What's the most interesting place you've visited?"
    );
    topics.push(
      "Are you the type who likes to plan every detail of a trip, or do you prefer spontaneous adventures?"
    );

    // Avoid repeating recent topics
    const recentTopics = this.conversationHistory.slice(-3).map((h) => h.topic);
    const availableTopics = topics.filter((topic) => {
      const topicKey = topic.substring(0, 20);
      return !recentTopics.includes(topicKey);
    });

    if (availableTopics.length === 0) {
      return null; // No new topics available
    }

    const selectedTopic =
      availableTopics[Math.floor(Math.random() * availableTopics.length)];
    this.lastConversationTopic = selectedTopic.substring(0, 20); // Store key

    return selectedTopic;
  }

  // Perform safety check for stationary detection
  static async performSafetyCheck() {
    if (!this.lastLocationUpdate) return;

    const timeSinceLastUpdate = Date.now() - this.lastLocationUpdate;

    // If user hasn't moved for 2 minutes, check if they're safe
    if (timeSinceLastUpdate > 120000) {
      // 2 minutes
      this.locationStationaryTime += 30; // Add 30 seconds (check interval)

      if (this.locationStationaryTime >= 120) {
        // 2 minutes stationary
        await this.speak(
          "Hey, I noticed you've been in the same spot for a while. Are you safe? Is everything okay?"
        );
        this.locationStationaryTime = 0; // Reset to avoid repeated warnings
      }
    }
  }

  // Get time-based greeting
  static getTimeBasedGreeting() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return "Good morning!";
    } else if (hour >= 12 && hour < 17) {
      return "Good afternoon!";
    } else if (hour >= 17 && hour < 22) {
      return "Good evening!";
    } else {
      return "Hope you're doing well!";
    }
  }

  // Get location-specific information
  static getLocationInfo(locationName) {
    const locationLower = locationName.toLowerCase();

    // This could be enhanced with a real location database
    const locationTips = {
      downtown:
        "Downtown areas usually have great food scenes and interesting architecture!",
      residential:
        "Residential neighborhoods often have the best local gems and quiet cafes.",
      "business district":
        "Business districts can have surprisingly good lunch spots and coffee shops.",
      historic:
        "Historic areas are full of stories and usually have unique local businesses.",
      waterfront:
        "Waterfront areas often have beautiful views and fresh seafood options!",
      shopping:
        "Shopping districts are perfect for finding both food courts and upscale dining.",
      university:
        "University areas typically have budget-friendly food and vibrant atmosphere.",
    };

    for (const [key, tip] of Object.entries(locationTips)) {
      if (locationLower.includes(key)) {
        return tip;
      }
    }

    return "Every place has its own character and hidden gems to discover!";
  }

  // Calculate distance between two coordinates (in km)
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Get random interval between min and max
  static getRandomInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Start navigation mode with continuous speaking
  static async startNavigation() {
    try {
      console.log("🧭 Starting navigation mode...");
      this.navigationSpeakCount = 0;

      // Initial navigation greeting
      const { selectedRoute, locationName } = this.context;
      const routeName = selectedRoute?.name || "your destination";
      const greeting = locationName
        ? `Great! Let's start our journey to ${routeName}. We're currently in ${locationName}. I'll keep you updated every step of the way!`
        : `Perfect! Navigation started to ${routeName}. I'll be your guide and companion throughout this journey!`;

      await this.speak(greeting);

      // Start speaking every 10 seconds during navigation
      this.startNavigationSpeaking();
    } catch (error) {
      console.error("❌ Start navigation error:", error);
    }
  }

  // Stop navigation mode
  static async stopNavigation() {
    try {
      console.log("🏁 Stopping navigation mode...");

      // IMMEDIATELY stop all ongoing speech and timers to prevent conflicts
      await this.stopAllSpeaking();

      // Clear navigation speaking timer
      if (this.navigationSpeakTimer) {
        clearInterval(this.navigationSpeakTimer);
        this.navigationSpeakTimer = null;
      }

      // Reset navigation state including checkpoints
      this.navigationSpeakCount = 0;
      this.lastNavigationInstruction = null;
      this.navigationInstructionLocations.clear();

      // Reset checkpoint system
      this.routeCheckpoints = [];
      this.currentCheckpointIndex = 0;
      this.checkpointCompleted.clear();
      this.lastCheckpointTime = null;
      this.routeCoordinates = [];

      // Wait a moment for any ongoing speech to fully stop, then speak arrival message
      setTimeout(async () => {
        await this.speak(
          "Congratulations! You've arrived at your destination safely. I hope you enjoyed our journey together!"
        );
      }, 500); // 500ms delay to ensure previous speech stops
    } catch (error) {
      console.error("❌ Stop navigation error:", error);
    }
  }

  // Start continuous speaking during navigation
  static startNavigationSpeaking() {
    if (this.navigationSpeakTimer) {
      clearInterval(this.navigationSpeakTimer);
    }

    // Speak every 10 seconds during navigation
    this.navigationSpeakTimer = setInterval(() => {
      if (this.isListening && this.context.isNavigating) {
        this.speakNavigationUpdate();
      } else {
        // Stop timer if not navigating anymore
        clearInterval(this.navigationSpeakTimer);
        this.navigationSpeakTimer = null;
      }
    }, 10000); // 10 seconds
  }

  // Generate and speak navigation updates every 10 seconds
  static async speakNavigationUpdate() {
    try {
      // Check if navigation is still active and we're still listening
      if (!this.isListening || !this.context.isNavigating) {
        console.log(
          "🔇 Navigation stopped or not listening, skipping speak update"
        );
        return;
      }

      this.navigationSpeakCount++;
      const {
        nextTurn,
        routeProgress,
        locationName,
        nearbySpots,
        nearbyPlaces,
        currentLocation,
        safetyLevel,
        timeOfDay,
      } = this.context;

      console.log(`🗣️ Navigation speak #${this.navigationSpeakCount}`);

      // Check if we're near a checkpoint that needs a navigation instruction
      const shouldGiveNavigationInstruction =
        this.shouldProvideCheckpointInstruction();

      if (shouldGiveNavigationInstruction) {
        // Priority 1: Checkpoint-based navigation instructions
        const checkpointInstruction =
          await this.getCheckpointNavigationInstruction();
        if (checkpointInstruction && this.context.isNavigating) {
          await this.speak(checkpointInstruction, { priority: "high" });
          return;
        }
      }

      // Priority 2: Critical immediate turn directions (safety override)
      if (nextTurn) {
        const distance = parseInt(nextTurn.distance) || 0;

        if (distance <= 50) {
          // Immediate turns for safety - bypass checkpoint system
          if (
            !this.hasGivenNavigationInstructionForLocation(nextTurn.instruction)
          ) {
            if (this.context.isNavigating) {
              await this.speak(`${nextTurn.instruction} right now!`, {
                priority: "high",
              });
            }
            return;
          }
        }
      }

      // Priority 3: City commentary and storytelling (main content between checkpoints)
      try {
        const cityCommentary = await this.generateCityCommentary({
          currentLocation,
          locationName,
          nearbyPlaces,
          nearbySpots,
          safetyLevel,
          timeOfDay,
          speakCount: this.navigationSpeakCount,
          routeProgress,
          checkpointProgress: this.getCurrentCheckpointProgress(),
        });

        if (
          cityCommentary &&
          typeof cityCommentary === "string" &&
          cityCommentary.trim().length > 0 &&
          this.context.isNavigating
        ) {
          await this.speak(cityCommentary.trim());
          return;
        }
      } catch (error) {
        console.error("❌ Error generating city commentary:", error);
      }

      // Priority 4: Fallback content if all else fails
      if (this.context.isNavigating) {
        const fallbackContent = this.generateFallbackContent();
        await this.speak(fallbackContent);
      }
    } catch (error) {
      console.error("❌ Navigation speak error:", error);
    }
  }

  // Check if we should provide a checkpoint instruction
  static shouldProvideCheckpointInstruction() {
    if (!this.routeCheckpoints.length || !this.context.currentLocation) {
      return false;
    }

    // Check if we're approaching the next unvisited checkpoint
    const nextCheckpointIndex = this.currentCheckpointIndex;
    if (nextCheckpointIndex >= this.routeCheckpoints.length) {
      return false;
    }

    const nextCheckpoint = this.routeCheckpoints[nextCheckpointIndex];
    if (!nextCheckpoint || this.checkpointCompleted.has(nextCheckpointIndex)) {
      return false;
    }

    const distanceToCheckpoint = this.calculateDistance(
      this.context.currentLocation.latitude,
      this.context.currentLocation.longitude,
      nextCheckpoint.latitude,
      nextCheckpoint.longitude
    );

    // Give instruction when within 200 meters of checkpoint
    return distanceToCheckpoint <= 200;
  }

  // Get navigation instruction for current checkpoint
  static async getCheckpointNavigationInstruction() {
    const nextCheckpointIndex = this.currentCheckpointIndex;
    if (nextCheckpointIndex >= this.routeCheckpoints.length) {
      return null;
    }

    const checkpoint = this.routeCheckpoints[nextCheckpointIndex];
    if (!checkpoint || this.checkpointCompleted.has(nextCheckpointIndex)) {
      return null;
    }

    // Generate contextual instruction using AI
    try {
      const instruction =
        await IntelligentAIService.generateCheckpointInstruction({
          checkpoint,
          currentLocation: this.context.currentLocation,
          locationName: this.context.locationName,
          progress: checkpoint.progress,
          isDestination: checkpoint.type === "destination",
        });

      if (
        instruction &&
        typeof instruction === "string" &&
        instruction.trim().length > 0
      ) {
        return instruction.trim();
      }
    } catch (error) {
      console.error("❌ Error generating checkpoint instruction:", error);
    }

    // Fallback to basic checkpoint instruction
    return checkpoint.instruction;
  }

  // Generate city commentary and stories for navigation
  static async generateCityCommentary(context) {
    if (!IntelligentAIService.isInitialized) {
      return this.getFallbackCityCommentary(context);
    }

    try {
      // Use AI to generate engaging city commentary
      const commentary = await IntelligentAIService.generateCityCommentary({
        currentLocation: context.currentLocation,
        locationName: context.locationName,
        nearbyPlaces: context.nearbyPlaces,
        nearbySpots: context.nearbySpots,
        safetyLevel: context.safetyLevel,
        timeOfDay: context.timeOfDay,
        speakCount: context.speakCount,
        routeProgress: context.routeProgress,
        checkpointProgress: context.checkpointProgress,
        conversationHistory: this.conversationHistory.slice(-3), // Recent context
      });

      if (
        commentary &&
        typeof commentary === "string" &&
        commentary.trim().length > 0
      ) {
        return commentary.trim();
      }
    } catch (error) {
      console.error("❌ Error generating AI city commentary:", error);
    }

    // Fallback to hardcoded city commentary
    return this.getFallbackCityCommentary(context);
  }

  // Fallback city commentary when AI is not available
  static getFallbackCityCommentary(context) {
    const { locationName, nearbyPlaces, speakCount, timeOfDay, routeProgress } =
      context;

    // Rotate through different types of commentary
    const commentaryType = speakCount % 5;

    switch (commentaryType) {
      case 0:
        return this.getCityHistoryCommentary(locationName);

      case 1:
        return this.getFoodAndCultureCommentary(nearbyPlaces, locationName);

      case 2:
        return this.getArchitectureAndLandmarksCommentary(locationName);

      case 3:
        return this.getTimeBasedCityCommentary(timeOfDay, locationName);

      case 4:
      default:
        return this.getProgressAndEncouragementCommentary(routeProgress);
    }
  }

  // Get current checkpoint progress info
  static getCurrentCheckpointProgress() {
    if (!this.routeCheckpoints.length) {
      return { total: 0, completed: 0, current: 0 };
    }

    return {
      total: this.routeCheckpoints.length,
      completed: this.checkpointCompleted.size,
      current: this.currentCheckpointIndex,
      progress:
        this.routeCheckpoints.length > 0
          ? (this.checkpointCompleted.size / this.routeCheckpoints.length) * 100
          : 0,
    };
  }

  // Check if user is at the same location to avoid repetitive commentary
  static isAtSameLocation() {
    const { currentLocation } = this.context;
    if (!this.lastSpokenLocation || !currentLocation) return false;

    const distance = this.calculateDistance(
      this.lastSpokenLocation.latitude,
      this.lastSpokenLocation.longitude,
      currentLocation.latitude,
      currentLocation.longitude
    );

    // Consider "same location" if within 50 meters
    return distance < 50;
  }

  // Check if navigation instruction has already been given for current location
  static hasGivenNavigationInstructionForLocation(instruction) {
    const { currentLocation, nextTurn } = this.context;
    if (!currentLocation || !nextTurn) return false;

    // Create a location key based on coordinates (rounded to avoid precision issues)
    const locationKey = `${Math.round(
      currentLocation.latitude * 10000
    )},${Math.round(currentLocation.longitude * 10000)}`;

    // Create instruction key combining location and turn instruction
    const instructionKey = `${locationKey}:${nextTurn.instruction}:${nextTurn.distance}`;

    // Check if this exact instruction has been given at this location
    const lastGiven = this.navigationInstructionLocations.get(instructionKey);

    // If instruction was given recently (within 30 seconds), skip it
    if (lastGiven && Date.now() - lastGiven < 30000) {
      return true;
    }

    // Mark this instruction as given for this location
    this.navigationInstructionLocations.set(instructionKey, Date.now());

    // Clean up old entries (older than 5 minutes) to prevent memory buildup
    for (const [
      key,
      timestamp,
    ] of this.navigationInstructionLocations.entries()) {
      if (Date.now() - timestamp > 300000) {
        // 5 minutes
        this.navigationInstructionLocations.delete(key);
      }
    }

    return false;
  }

  // Update location tracking for anti-repetition
  static updateLocationTracking() {
    const { currentLocation } = this.context;
    this.lastSpokenLocation = currentLocation;
  }

  // Generate anti-repetitive fallback when AI fails
  static async generateAntiRepetitiveFallback() {
    const { routeProgress, locationName, isNavigating } = this.context;

    // Vary response based on speak count to avoid repetition
    const variation = this.navigationSpeakCount % 4;

    switch (variation) {
      case 0:
        return isNavigating
          ? `Making steady progress at ${routeProgress}%. Everything looks good ahead.`
          : "I'm here with you, keeping an eye on the route and your safety.";

      case 1:
        return locationName
          ? `Currently in ${locationName}. You're doing great on this journey.`
          : "Navigation is going smoothly. I'm monitoring everything for you.";

      case 2:
        return "I'm tracking your route and safety. Let me know if you need anything.";

      case 3:
      default:
        return "Everything's looking good from here. Stay safe and keep going!";
    }
  }

  // Calculate distance between two coordinates (haversine formula)
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Initialize route checkpoints from selected route
  static initializeRouteCheckpoints(selectedRoute) {
    try {
      console.log("🎯 Initializing route checkpoints...");

      // Decode route polyline if available
      if (
        selectedRoute.overview_polyline &&
        selectedRoute.overview_polyline.points
      ) {
        this.routeCoordinates = this.decodePolyline(
          selectedRoute.overview_polyline.points
        );
      } else if (selectedRoute.legs && selectedRoute.legs.length > 0) {
        // Fallback: use start/end points and waypoints if available
        this.routeCoordinates = [];
        selectedRoute.legs.forEach((leg) => {
          this.routeCoordinates.push({
            latitude: leg.start_location.lat,
            longitude: leg.start_location.lng,
          });
          if (leg.steps) {
            leg.steps.forEach((step) => {
              this.routeCoordinates.push({
                latitude: step.end_location.lat,
                longitude: step.end_location.lng,
              });
            });
          }
        });
      }

      if (this.routeCoordinates.length === 0) {
        console.log("⚠️ No route coordinates found, using basic checkpoints");
        return;
      }

      // Generate checkpoints every 500 meters or every 8 points (whichever is more appropriate)
      this.routeCheckpoints = this.generateRouteCheckpoints(
        this.routeCoordinates
      );
      this.currentCheckpointIndex = 0;
      this.checkpointCompleted.clear();

      console.log(
        `✅ Generated ${this.routeCheckpoints.length} route checkpoints`
      );
    } catch (error) {
      console.error("❌ Error initializing route checkpoints:", error);
      this.routeCheckpoints = [];
    }
  }

  // Generate checkpoints along the route
  static generateRouteCheckpoints(routeCoordinates) {
    const checkpoints = [];
    const totalDistance = this.calculateRouteDistance(routeCoordinates);
    const checkpointInterval = Math.max(
      1,
      Math.floor(routeCoordinates.length / 8)
    );

    // Add start point
    if (routeCoordinates.length > 0) {
      checkpoints.push({
        ...routeCoordinates[0],
        index: 0,
        progress: 0,
        distanceFromStart: 0,
        instruction: "Starting your journey",
        type: "start",
      });
    }

    // Add intermediate checkpoints
    for (
      let i = checkpointInterval;
      i < routeCoordinates.length - checkpointInterval;
      i += checkpointInterval
    ) {
      const coord = routeCoordinates[i];
      const distanceFromStart = this.calculateDistanceAlongRoute(
        routeCoordinates,
        0,
        i
      );
      const progress =
        totalDistance > 0 ? (distanceFromStart / totalDistance) * 100 : 0;

      checkpoints.push({
        ...coord,
        index: Math.floor(i / checkpointInterval),
        progress: Math.round(progress),
        distanceFromStart,
        instruction: this.generateCheckpointInstruction(
          i,
          routeCoordinates,
          progress
        ),
        type: "intermediate",
      });
    }

    // Add destination
    if (routeCoordinates.length > 1) {
      checkpoints.push({
        ...routeCoordinates[routeCoordinates.length - 1],
        index: checkpoints.length,
        progress: 100,
        distanceFromStart: totalDistance,
        instruction: "You have arrived at your destination",
        type: "destination",
      });
    }

    return checkpoints;
  }

  // Generate instruction for a checkpoint
  static generateCheckpointInstruction(coordIndex, routeCoordinates, progress) {
    if (progress <= 25) {
      return "Continue straight ahead";
    } else if (progress <= 50) {
      return "Keep following the route";
    } else if (progress <= 75) {
      return "You're making great progress";
    } else {
      return "Almost at your destination";
    }
  }

  // Calculate total distance of route
  static calculateRouteDistance(routeCoordinates) {
    let totalDistance = 0;
    for (let i = 1; i < routeCoordinates.length; i++) {
      totalDistance += this.calculateDistance(
        routeCoordinates[i - 1].latitude,
        routeCoordinates[i - 1].longitude,
        routeCoordinates[i].latitude,
        routeCoordinates[i].longitude
      );
    }
    return totalDistance;
  }

  // Calculate distance along route up to a specific point
  static calculateDistanceAlongRoute(routeCoordinates, startIndex, endIndex) {
    let distance = 0;
    for (
      let i = startIndex + 1;
      i <= endIndex && i < routeCoordinates.length;
      i++
    ) {
      distance += this.calculateDistance(
        routeCoordinates[i - 1].latitude,
        routeCoordinates[i - 1].longitude,
        routeCoordinates[i].latitude,
        routeCoordinates[i].longitude
      );
    }
    return distance;
  }

  // Check if user has reached the next checkpoint
  static checkCheckpointProgress(currentLocation) {
    if (
      !this.routeCheckpoints.length ||
      this.currentCheckpointIndex >= this.routeCheckpoints.length
    ) {
      return;
    }

    const nextCheckpoint = this.routeCheckpoints[this.currentCheckpointIndex];
    if (!nextCheckpoint) return;

    const distanceToCheckpoint = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      nextCheckpoint.latitude,
      nextCheckpoint.longitude
    );

    // If within 100 meters of checkpoint, consider it reached
    if (distanceToCheckpoint <= 100) {
      this.reachCheckpoint(this.currentCheckpointIndex);
    }
  }

  // Handle reaching a checkpoint
  static async reachCheckpoint(checkpointIndex) {
    if (this.checkpointCompleted.has(checkpointIndex)) {
      return; // Already processed this checkpoint
    }

    console.log(`🎯 Reached checkpoint ${checkpointIndex}`);
    this.checkpointCompleted.add(checkpointIndex);
    this.lastCheckpointTime = Date.now();

    const checkpoint = this.routeCheckpoints[checkpointIndex];
    if (!checkpoint) return;

    // Give navigation instruction for this checkpoint
    if (this.isListening && checkpoint.instruction) {
      await this.speak(checkpoint.instruction, { priority: "high" });

      // Add progress update if not at start or end
      if (checkpoint.type === "intermediate") {
        setTimeout(async () => {
          if (this.isListening && this.context.isNavigating) {
            await this.speak(
              `You're ${checkpoint.progress}% of the way to your destination. Great progress!`
            );
          }
        }, 2000);
      }
    }

    // Move to next checkpoint
    this.currentCheckpointIndex++;
  }

  // Decode Google Maps polyline
  static decodePolyline(encoded) {
    const coordinates = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coordinates.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return coordinates;
  }

  // Get navigation progress update messages
  static getNavigationUpdateMessages() {
    const { routeProgress, locationName } = this.context;
    const messages = [];

    if (routeProgress <= 10) {
      messages.push(
        "We're just getting started on our journey. The route looks great ahead!"
      );
      if (locationName) {
        messages.push(
          `We're beginning our trip from ${locationName}. Let's make this a pleasant journey!`
        );
      }
    } else if (routeProgress <= 25) {
      messages.push(
        "We're making good initial progress. About a quarter of the way there!"
      );
      messages.push(
        "The first part of our journey is going smoothly. Keep it up!"
      );
    } else if (routeProgress <= 50) {
      messages.push(
        "Excellent! We're approaching the halfway point of our journey."
      );
      messages.push(
        "You're doing fantastic! We're making steady progress toward our destination."
      );
    } else if (routeProgress <= 75) {
      messages.push(
        "We're more than halfway there! The end is getting closer."
      );
      messages.push(
        "Three quarters of the journey complete. You're almost there!"
      );
    } else if (routeProgress <= 90) {
      messages.push(
        "We're in the final stretch! Your destination is coming up soon."
      );
      messages.push(
        "Almost there! Just a little bit more and we'll have arrived safely."
      );
    } else {
      messages.push(
        "We're very close to your destination now. Get ready to arrive!"
      );
      messages.push(
        "Final approach to your destination. You've done an amazing job!"
      );
    }

    return messages;
  }

  // Get city history commentary
  static getCityHistoryCommentary(locationName) {
    if (!locationName) {
      return "Every place has its own unique story and history. I wonder what interesting things have happened in this area over the years.";
    }

    const locationLower = locationName.toLowerCase();

    // Generic historical insights for different area types
    if (
      locationLower.includes("downtown") ||
      locationLower.includes("center")
    ) {
      return `${locationName} likely has a rich history as the heart of the community. Downtown areas are usually where cities first began to grow and develop.`;
    } else if (locationLower.includes("historic")) {
      return `${locationName} sounds like it has some fascinating historical significance. Historic districts often preserve the character and stories of earlier times.`;
    } else if (
      locationLower.includes("old") ||
      locationLower.includes("heritage")
    ) {
      return `${locationName} probably has some wonderful old architecture and stories from the past. These areas often have the most character!`;
    } else if (
      locationLower.includes("university") ||
      locationLower.includes("college")
    ) {
      return `${locationName} must have such vibrant energy with all the students and academic activity. University areas are often centers of innovation and culture.`;
    } else {
      return `${locationName} has its own unique character and history. Every neighborhood develops its own personality over time.`;
    }
  }

  // Get food and culture commentary
  static getFoodAndCultureCommentary(nearbyPlaces, locationName) {
    const restaurants =
      nearbyPlaces?.filter(
        (place) =>
          place.type?.includes("restaurant") ||
          place.type?.includes("food") ||
          place.category?.includes("dining")
      ) || [];

    const cafes =
      nearbyPlaces?.filter(
        (place) =>
          place.type?.includes("cafe") ||
          place.name?.toLowerCase().includes("coffee") ||
          place.name?.toLowerCase().includes("cafe")
      ) || [];

    if (restaurants.length > 0) {
      const restaurant = restaurants[0];
      return `I can see ${restaurant.name} in this area. Local restaurants are often the heart of a community - they bring people together and reflect the local culture and tastes.`;
    } else if (cafes.length > 0) {
      const cafe = cafes[0];
      return `There's ${cafe.name} nearby. Coffee shops are such interesting social spaces - they're often where locals gather, work, and connect with their community.`;
    } else if (locationName) {
      return `${locationName} has its own local food scene and culture. Every area develops its own unique dining personality based on the people who live and work there.`;
    } else {
      return "Food tells the story of a place - the local restaurants, markets, and cafes reflect the community's culture, history, and the people who call it home.";
    }
  }

  // Get architecture and landmarks commentary
  static getArchitectureAndLandmarksCommentary(locationName) {
    if (!locationName) {
      return "Architecture around here tells a story about when this area was built and what the priorities were at the time. Every building has its own character.";
    }

    const locationLower = locationName.toLowerCase();

    if (
      locationLower.includes("business") ||
      locationLower.includes("commercial")
    ) {
      return `${locationName} probably has some interesting commercial architecture. Business districts often showcase the economic growth and architectural trends of different eras.`;
    } else if (
      locationLower.includes("residential") ||
      locationLower.includes("neighborhood")
    ) {
      return `${locationName} likely has distinctive residential architecture that reflects when it was developed. Each era of home building has its own style and character.`;
    } else if (locationLower.includes("industrial")) {
      return `${locationName} has that industrial character - these areas often have fascinating architecture designed for function, which creates its own unique aesthetic.`;
    } else if (
      locationLower.includes("waterfront") ||
      locationLower.includes("harbor")
    ) {
      return `${locationName} must have beautiful views and architecture adapted to the waterfront. Coastal areas often have unique building styles influenced by the marine environment.`;
    } else {
      return `The architecture in ${locationName} reflects the community's growth and character. Buildings are like a timeline showing how an area has evolved over the years.`;
    }
  }

  // Get time-based city commentary
  static getTimeBasedCityCommentary(timeOfDay, locationName) {
    const hour = new Date().getHours();
    const timeContext = locationName ? ` in ${locationName}` : " in this area";

    if (hour >= 6 && hour < 9) {
      return `It's morning rush hour${timeContext}. You can almost feel the energy as people start their day - heading to work, getting coffee, beginning their daily routines.`;
    } else if (hour >= 9 && hour < 12) {
      return `Mid-morning${timeContext} has a different pace - more relaxed than rush hour. This is when you often see people running errands, walking dogs, or enjoying a slower start to their day.`;
    } else if (hour >= 12 && hour < 14) {
      return `Lunchtime${timeContext}! This is when communities come alive with people grabbing meals, meeting friends, and taking breaks from their day.`;
    } else if (hour >= 14 && hour < 17) {
      return `Afternoon${timeContext} is such a pleasant time for travel. The light is beautiful, and there's a calm energy as the day winds toward evening.`;
    } else if (hour >= 17 && hour < 19) {
      return `Evening rush hour${timeContext} - people are heading home, meeting friends, or starting their evening activities. There's anticipation in the air.`;
    } else if (hour >= 19 && hour < 22) {
      return `Evening${timeContext} is when communities really show their character - dinner spots lighting up, people strolling, the social side of the neighborhood coming alive.`;
    } else {
      return `Night time${timeContext} has its own quiet beauty. Most daily activities have wound down, leaving a peaceful atmosphere perfect for reflection.`;
    }
  }

  // Get progress and encouragement commentary
  static getProgressAndEncouragementCommentary(routeProgress) {
    if (routeProgress <= 25) {
      return "You're doing great on this journey! I love being your travel companion and sharing these moments with you. The route ahead looks smooth.";
    } else if (routeProgress <= 50) {
      return "We're making excellent progress together! These kinds of journeys are what I really enjoy - getting to explore and learn about new places with you.";
    } else if (routeProgress <= 75) {
      return "You've been such a wonderful travel companion! We're getting close to our destination, but I'm enjoying every moment of this trip with you.";
    } else {
      return "Almost there! This has been such a pleasant journey together. I hope you've enjoyed our conversations and discoveries along the way.";
    }
  }

  // Generate fallback content when all else fails
  static generateFallbackContent() {
    const fallbackMessages = [
      "I'm here with you, keeping watch and enjoying the journey together.",
      "Everything's looking good from here. I'm monitoring your route and safety.",
      "What a nice area to travel through. I'm always curious about the places we pass.",
      "You're doing great! I'm here if you need anything or want to chat.",
      "I love being your travel companion on journeys like this.",
    ];

    const variation = this.navigationSpeakCount % fallbackMessages.length;
    return fallbackMessages[variation];
  }

  // Get location-based messages during navigation
  static getLocationBasedMessages() {
    const { nearbySpots, nearbyPlaces, locationName } = this.context;
    const messages = [];
    const hour = new Date().getHours();

    // Time-based observations
    if (hour >= 6 && hour < 12) {
      messages.push(
        "What a beautiful morning for a drive! The traffic seems light."
      );
      messages.push(
        "Morning navigation is always pleasant. Hope you're enjoying the journey!"
      );
    } else if (hour >= 12 && hour < 17) {
      messages.push(
        "Perfect afternoon for traveling. The weather looks great for driving."
      );
      messages.push(
        "Afternoon drives can be so relaxing. How are you feeling about the trip?"
      );
    } else if (hour >= 17 && hour < 22) {
      messages.push(
        "Evening travel has its own charm. The roads are looking good."
      );
      messages.push(
        "Beautiful evening for navigation. The lighting is perfect for driving."
      );
    } else {
      messages.push(
        "Night driving requires extra attention. I'm keeping extra watch for you."
      );
      messages.push(
        "It's quiet out here at night. I'm monitoring everything carefully."
      );
    }

    // Safety observations
    if (nearbySpots?.some((spot) => spot.type === "police")) {
      messages.push(
        "I notice we're passing through a well-monitored area with police presence nearby."
      );
    }

    if (nearbySpots?.some((spot) => spot.type === "hospital")) {
      messages.push(
        "This area has good medical facilities nearby. Always reassuring to know!"
      );
    }

    // Food and places observations during navigation
    if (nearbyPlaces?.length > 0) {
      const restaurants = nearbyPlaces.filter(
        (place) =>
          place.type?.includes("restaurant") || place.type?.includes("food")
      );
      const cafes = nearbyPlaces.filter(
        (place) =>
          place.type?.includes("cafe") ||
          place.name?.toLowerCase().includes("coffee")
      );

      if (restaurants.length > 0) {
        messages.push(
          `We're passing by ${restaurants[0].name}. Looks like a nice dining spot in this area!`
        );
      }

      if (cafes.length > 0) {
        messages.push(
          `I can see ${cafes[0].name} around here. Great coffee spots make any area special!`
        );
      }
    }

    // Location-specific comments
    if (locationName) {
      const locationLower = locationName.toLowerCase();
      if (locationLower.includes("downtown")) {
        messages.push(
          `We're navigating through ${locationName}. Downtown areas always have so much character!`
        );
      } else if (locationLower.includes("residential")) {
        messages.push(
          `Passing through ${locationName}. Residential areas are usually so peaceful for driving.`
        );
      } else if (locationLower.includes("business")) {
        messages.push(
          `We're in the ${locationName}. Business districts can be bustling during certain hours.`
        );
      }
    }

    return messages;
  }
}
