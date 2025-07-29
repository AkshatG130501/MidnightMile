/**
 * Intelligent AI Service
 * Handles intelligent conversation generation using LLM (Gemini/OpenAI)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import Constants from "expo-constants";

export class IntelligentAIService {
  static genAI = null;
  static model = null;
  static isInitialized = false;
  static conversationHistory = [];
  static maxHistoryLength = 10; // Keep last 10 exchanges

  // Initialize the AI service
  static initialize() {
    try {
      // Try multiple ways to get the API key
      let apiKey = process.env.GEMINI_API_KEY;

      // Fallback to manifest extra
      if (!apiKey) {
        apiKey = process.env.GEMINI_API_KEY;
      }

      // Fallback to process.env for development
      if (!apiKey) {
        apiKey = process.env.GEMINI_API_KEY;
      }

      console.log("🔍 Checking for Gemini API key...");
      console.log(
        "📋 Constants.expoConfig?.extra:",
        Constants.expoConfig?.extra
      );
      console.log("🔑 Found API key:", apiKey ? "Yes" : "No");

      if (!apiKey) {
        console.error("❌ Gemini API key not found in configuration");
        console.error("📍 Checked locations:", {
          expoConfig: !!process.env.GEMINI_API_KEY,
          manifest: !!process.env.GEMINI_API_KEY,
          processEnv: !!process.env.GEMINI_API_KEY,
        });
        return false;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      this.isInitialized = true;

      console.log(
        "✅ Intelligent AI Service initialized with Gemini 1.5 Flash"
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize Intelligent AI Service:", error);
      return false;
    }
  }

  // Generate intelligent response based on context
  static async generateResponse(userInput, context = {}) {
    if (!this.isInitialized) {
      console.log("⚠️ Intelligent AI Service not initialized, using fallback");
      return this.getFallbackResponse(userInput, context);
    }

    try {
      const prompt = this.buildContextualPrompt(userInput, context);

      console.log("🧠 Generating intelligent response...");

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Add to conversation history
      this.addToHistory(userInput, text);

      console.log(
        "✅ Generated intelligent response:",
        text.substring(0, 100) + "..."
      );
      return text;
    } catch (error) {
      console.error("❌ Error generating intelligent response:", error);
      return this.getFallbackResponse(userInput, context);
    }
  }

  // Build contextual prompt for the LLM
  static buildContextualPrompt(userInput, context) {
    const {
      currentLocation,
      locationName,
      isNavigating,
      nextTurn,
      routeProgress,
      nearbyPlaces,
      nearbySpots,
      safetyLevel,
      timeOfDay,
    } = context;

    const basePersonality = `You are Bella, a friendly, caring, and knowledgeable AI travel companion for the Midnight Mile safety navigation app. You help users stay safe during their journeys while providing engaging conversation.

Your personality traits:
- Warm, friendly, and conversational like a good friend
- Safety-conscious but not paranoid
- Knowledgeable about local areas, food, and points of interest
- Encouraging and supportive
- Concise but engaging (keep responses under 50 words usually)
- Use natural, conversational language

Your primary responsibilities:
1. Provide turn-by-turn navigation guidance when needed
2. Share interesting information about the current location
3. Monitor user safety and check in when appropriate
4. Recommend nearby food, attractions, and points of interest
5. Provide emotional support and companionship during travel`;

    let contextInfo = `\nCurrent Context:`;

    if (locationName) {
      contextInfo += `\n- Location: ${locationName}`;
    }

    if (currentLocation) {
      contextInfo += `\n- Coordinates: ${currentLocation.latitude}, ${currentLocation.longitude}`;
    }

    if (isNavigating) {
      contextInfo += `\n- Currently navigating (${routeProgress}% complete)`;
      if (nextTurn) {
        contextInfo += `\n- Next turn: ${nextTurn.instruction} in ${nextTurn.distance}`;
      }
    }

    if (nearbyPlaces?.length > 0) {
      const places = nearbyPlaces
        .slice(0, 3)
        .map((p) => p.name)
        .join(", ");
      contextInfo += `\n- Nearby places: ${places}`;
    }

    if (nearbySpots?.length > 0) {
      const safeSpots = nearbySpots
        .filter((s) => s.type === "police" || s.type === "hospital")
        .slice(0, 2);
      if (safeSpots.length > 0) {
        contextInfo += `\n- Safety spots nearby: ${safeSpots
          .map((s) => s.name)
          .join(", ")}`;
      }
    }

    const hour = new Date().getHours();
    let timeContext = "";
    if (hour >= 6 && hour < 12) timeContext = "morning";
    else if (hour >= 12 && hour < 17) timeContext = "afternoon";
    else if (hour >= 17 && hour < 22) timeContext = "evening";
    else timeContext = "night";

    contextInfo += `\n- Time: ${timeContext}`;

    // Add recent conversation history for context
    let historyContext = "";
    if (this.conversationHistory.length > 0) {
      historyContext = `\n\nRecent conversation:`;
      this.conversationHistory.slice(-3).forEach((exchange, index) => {
        historyContext += `\nUser: ${exchange.user}\nBella: ${exchange.ai}`;
      });
    }

    const userMessage = userInput || "continue the conversation naturally";

    return `${basePersonality}${contextInfo}${historyContext}

User says: "${userMessage}"

Respond as Bella, keeping in mind the current context and your role as a helpful travel companion. If navigation guidance is needed, prioritize that. Otherwise, engage in friendly conversation about the journey, location, or ask how the user is doing.

Response:`;
  }

  // Generate conversation topics intelligently
  static async generateConversationTopic(context) {
    if (!this.isInitialized) {
      return this.getFallbackConversationTopic(context);
    }

    try {
      const prompt = this.buildTopicPrompt(context);
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      console.log(
        "💭 Generated conversation topic:",
        text.substring(0, 100) + "..."
      );
      return text;
    } catch (error) {
      console.error("❌ Error generating conversation topic:", error);
      return this.getFallbackConversationTopic(context);
    }
  }

  // Build prompt for generating conversation topics
  static buildTopicPrompt(context) {
    const {
      locationName,
      isNavigating,
      routeProgress,
      nearbyPlaces,
      nearbySpots,
    } = context;

    return `You are Bella, a friendly AI travel companion. Generate a natural conversation starter or comment based on the current situation. Keep it under 40 words and conversational.

Current situation:
${locationName ? `- In ${locationName}` : "- Traveling"}
${
  isNavigating
    ? `- Navigating (${routeProgress}% complete)`
    : "- Not currently navigating"
}
${
  nearbyPlaces?.length
    ? `- Near: ${nearbyPlaces
        .slice(0, 2)
        .map((p) => p.name)
        .join(", ")}`
    : ""
}

Generate a friendly, natural conversation starter that fits this context:`;
  }

  // Add exchange to conversation history
  static addToHistory(userInput, aiResponse) {
    this.conversationHistory.push({
      user: userInput,
      ai: aiResponse,
      timestamp: Date.now(),
    });

    // Keep only recent history
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(
        -this.maxHistoryLength
      );
    }
  }

  // Fallback responses when AI service is not available
  static getFallbackResponse(userInput = "", context = {}) {
    const { isNavigating, nextTurn, routeProgress, nearbySpots, locationName } =
      context;

    // Handle specific user inputs
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
        return `Your next turn is ${nextTurn.instruction} in ${nextTurn.distance}. I'll keep you updated as we go.`;
      } else {
        return "You don't have an active route right now. Would you like to set a destination?";
      }
    }

    if (
      userInput.toLowerCase().includes("food") ||
      userInput.toLowerCase().includes("hungry")
    ) {
      return "Let me look around for some good food options in this area. I'll keep an eye out for restaurants and cafes!";
    }

    // Context-based responses
    if (isNavigating && nextTurn) {
      return `You're doing fantastic! In about ${nextTurn.distance}, ${nextTurn.instruction}. How are you feeling about the journey?`;
    }

    if (isNavigating && routeProgress > 80) {
      return "You're almost at your destination! Just a little further. I've really enjoyed our conversation along the way!";
    }

    // Default friendly responses
    const defaults = [
      "How are you doing? I'm here to keep you company and help with whatever you need.",
      "Everything looks good from here. I'm keeping an eye on your route and safety. How's your day going?",
      "I'm enjoying being your travel companion! Is there anything interesting you've noticed about this area?",
      "You're doing great! I'm monitoring your journey and I'm here if you need anything.",
    ];

    return defaults[Math.floor(Math.random() * defaults.length)];
  }

  // Fallback conversation topics
  static getFallbackConversationTopic(context) {
    const { locationName, nearbyPlaces, isNavigating } = context;

    const topics = [
      `How are you feeling about the journey so far?`,
      `This area looks interesting! Have you been to ${
        locationName || "this part of town"
      } before?`,
      `I love being your travel companion. What's your favorite thing about exploring new places?`,
      `Everything looks safe and peaceful around here. How's your day been?`,
    ];

    if (nearbyPlaces?.length > 0) {
      topics.push(
        `I can see ${nearbyPlaces[0].name} nearby. Have you ever been there?`
      );
    }

    if (isNavigating) {
      topics.push(
        "How are you finding the route so far? I'm here to help with anything you need."
      );
    }

    return topics[Math.floor(Math.random() * topics.length)];
  }

  // Generate intelligent navigation updates for the 10-second speaking feature
  static async generateNavigationUpdate(context) {
    try {
      const {
        currentLocation,
        locationName,
        isNavigating,
        nextTurn,
        routeProgress,
        nearbyPlaces,
        nearbySpots,
        safetyLevel,
        timeOfDay,
        speakCount,
        lastLocation,
        isRepeatedLocation,
      } = context;

      // Enhanced prompt with anti-repetition logic
      const prompt = `You are the AI companion for Midnight Mile, a safety-focused navigation app. You speak to users every 10 seconds during navigation to provide updates, encouragement, and contextual information.

CONTEXT:
- Current location: ${locationName || "Unknown location"}
- Navigation active: ${isNavigating}
- Route progress: ${routeProgress}%
- Next turn: ${
        nextTurn
          ? `${nextTurn.instruction} in ${nextTurn.distance}`
          : "None immediate"
      }
- Time of day: ${timeOfDay}
- Safety level: ${safetyLevel}/10
- Update number: ${speakCount}
- Nearby places: ${nearbyPlaces?.slice(0, 3).join(", ") || "None"}
- Safe spots nearby: ${nearbySpots?.length || 0} safe locations
- User is stationary: ${isRepeatedLocation}

ANTI-REPETITION RULES:
- If user is stationary (same location), acknowledge it and vary your approach
- Don't repeat the same turn instruction multiple times
- For distant turns (>500m), focus on encouragement, surroundings, or journey progress
- Vary between navigation updates, location commentary, and encouragement
- If no immediate turn, talk about surroundings, progress, or ask how they're feeling

INSTRUCTIONS:
- Keep responses under 25 words for quick speaking
- Vary your updates - never repeat the same style consecutively
- For immediate turns (<200m), give clear directions
- For distant turns (>500m), focus on encouragement or surroundings
- If user is stationary, acknowledge it positively and vary content
- Be supportive and friendly
- Mention safety when relevant
- Reference nearby landmarks occasionally

Generate a varied, intelligent navigation update:`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text().trim();

      // Clean up and validate response
      if (!text || text.length > 200) {
        return null; // Let fallback handle it
      }

      // Remove quotes if present
      const cleanText = text.replace(/^["']|["']$/g, "");

      // Add to conversation history with context
      this.conversationHistory.push({
        timestamp: Date.now(),
        type: "navigation_update",
        context: {
          routeProgress,
          locationName,
          speakCount,
          isRepeatedLocation,
          hasNextTurn: !!nextTurn,
        },
        response: cleanText,
      });

      // Keep history manageable
      if (this.conversationHistory.length > 50) {
        this.conversationHistory = this.conversationHistory.slice(-30);
      }

      return cleanText;
    } catch (error) {
      console.error("❌ IntelligentAIService navigation update error:", error);
      return null; // Let fallback handle it
    }
  }

  // Generate intelligent critical turn updates (for turns <100m)
  static async generateCriticalTurnUpdate(context) {
    try {
      const { nextTurn, distance, speakCount } = context;

      const prompt = `You are the AI companion for Midnight Mile. Generate a CLEAR, URGENT turn instruction for an immediate turn.

CONTEXT:
- Turn instruction: ${nextTurn.instruction}
- Distance to turn: ${nextTurn.distance} (${distance}m)
- This is update #${speakCount}

INSTRUCTIONS:
- Keep it under 15 words
- Be clear and urgent but friendly
- Vary the phrasing to avoid repetition
- Include the distance
- Make it actionable

Examples:
- "Turn right in 50 meters - stay in the right lane!"
- "Coming up! Left turn in 30 meters."
- "Almost there - turn left in 40 meters now."

Generate a clear, urgent turn instruction:`;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text().trim();

      // Remove quotes and validate
      const cleanText = text.replace(/^["']|["']$/g, "");

      if (!cleanText || cleanText.length > 100) {
        return null; // Let emergency fallback handle it
      }

      return cleanText;
    } catch (error) {
      console.error(
        "❌ IntelligentAIService critical turn update error:",
        error
      );
      return null;
    }
  }

  // Clear conversation history
  static clearHistory() {
    this.conversationHistory = [];
    console.log("🧹 Conversation history cleared");
  }

  // Generate checkpoint navigation instruction
  static async generateCheckpointInstruction(context) {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const {
        checkpoint,
        currentLocation,
        locationName,
        progress,
        isDestination,
      } = context;

      const prompt = `You are an AI navigation companion. Generate a clear, friendly checkpoint instruction.

Context:
- Current checkpoint progress: ${progress}%
- Location: ${locationName || "Unknown area"}
- Checkpoint type: ${checkpoint.type}
- Is destination: ${isDestination}

Guidelines:
- Keep it under 25 words
- Be encouraging and positive
- Include progress reference
- Use friendly, companion tone
- Don't repeat previous instructions

Examples:
- "Great job! You're 25% of the way there. Keep following this route ahead."
- "Excellent progress! We're halfway to your destination. Stay on this path."
- "Almost there! You're 75% complete. Your destination is coming up soon."

Generate a checkpoint instruction:`;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text().trim();

      // Clean and validate
      const cleanText = text.replace(/^["']|["']$/g, "");

      if (!cleanText || cleanText.length > 150) {
        return null; // Use fallback
      }

      return cleanText;
    } catch (error) {
      console.error(
        "❌ IntelligentAIService checkpoint instruction error:",
        error
      );
      return null;
    }
  }

  // Generate city commentary and stories
  static async generateCityCommentary(context) {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const {
        locationName,
        nearbyPlaces,
        speakCount,
        timeOfDay,
        routeProgress,
        checkpointProgress,
        conversationHistory,
      } = context;

      // Rotate commentary types to avoid repetition
      const commentaryTypes = [
        "history",
        "culture",
        "architecture",
        "local_life",
        "encouragement",
      ];
      const currentType = commentaryTypes[speakCount % commentaryTypes.length];

      // Build recent context to avoid repetition
      const recentTopics =
        conversationHistory?.map((h) => h.topic).join(", ") || "";

      const prompt = `You are an engaging AI travel companion providing city commentary during navigation.

Current Context:
- Location: ${locationName || "This area"}
- Commentary type: ${currentType}
- Time of day: ${timeOfDay || "unknown"}
- Route progress: ${routeProgress}%
- Checkpoint progress: ${checkpointProgress?.progress || 0}%
- Speak count: ${speakCount}
- Recent topics: ${recentTopics}

Available nearby places: ${
        nearbyPlaces?.map((p) => p.name).join(", ") || "None visible"
      }

Commentary Type Guidelines:
- history: Share interesting historical facts or stories about the area
- culture: Discuss local food, traditions, or cultural aspects
- architecture: Comment on buildings, design, or urban planning
- local_life: Talk about daily life, community, social aspects
- encouragement: Provide positive journey updates and companionship

Rules:
- Keep it engaging and conversational (30-50 words)
- Sound like a knowledgeable friend sharing interesting observations
- Don't repeat recent topics
- Be positive and encouraging
- Include specific details when possible
- Avoid navigation instructions (just commentary)

Generate ${currentType} commentary:`;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text().trim();

      // Clean and validate
      const cleanText = text.replace(/^["']|["']$/g, "");

      if (!cleanText || cleanText.length > 300) {
        return null; // Use fallback
      }

      return cleanText;
    } catch (error) {
      console.error("❌ IntelligentAIService city commentary error:", error);
      return null;
    }
  }

  // Get conversation statistics
  static getStats() {
    return {
      isInitialized: this.isInitialized,
      historyLength: this.conversationHistory.length,
      provider: "Gemini",
    };
  }
}

export default IntelligentAIService;
