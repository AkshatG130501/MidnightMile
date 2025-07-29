/**
 * AICompanionInterface Component
 * Provides the UI interface for the AI companion with voice controls
 * Maintains original button styling and position
 */

import React, { useState, useEffect, useRef } from "react";
import { Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../constants/theme";
import { AICompanionService } from "../services/AICompanionService";

export default function AICompanionInterface({
  isActive,
  onToggle,
  currentLocation,
  selectedRoute,
  nextTurn,
  routeProgress,
  isNavigating,
  nearbySpots,
}) {
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());

  // Update AI context when props change
  useEffect(() => {
    AICompanionService.updateContext({
      currentLocation,
      selectedRoute,
      nextTurn,
      routeProgress,
      isNavigating,
      nearbySpots,
    });
  }, [
    currentLocation,
    selectedRoute,
    nextTurn,
    routeProgress,
    isNavigating,
    nearbySpots,
  ]);

  // Handle AI companion activation/deactivation
  useEffect(() => {
    if (isActive) {
      initializeCompanion();
    } else {
      deactivateCompanion();
    }
  }, [isActive]);

  // Cleanup only on component unmount
  useEffect(() => {
    return () => {
      // Cleanup on unmount only
      AICompanionService.cleanup();
    };
  }, []); // Empty dependency array ensures this only runs on unmount

  // Periodic safety check-ins
  useEffect(() => {
    if (isActive && isNavigating) {
      const checkInInterval = setInterval(() => {
        const timeSinceLastInteraction = Date.now() - lastInteractionTime;
        // Check in every 5 minutes during navigation
        if (timeSinceLastInteraction > 5 * 60 * 1000) {
          AICompanionService.performSafetyCheckIn();
          setLastInteractionTime(Date.now());
        }
      }, 120000); // Check every minute

      return () => clearInterval(checkInInterval);
    }
  }, [isActive, isNavigating, lastInteractionTime]);

  const initializeCompanion = async () => {
    console.log("🤖 Initializing AI Companion Interface...");

    const initialized = await AICompanionService.initialize();
    if (initialized) {
      setIsListening(true);
      await AICompanionService.startListening();
      setLastInteractionTime(Date.now());
    }
  };

  const deactivateCompanion = async () => {
    console.log("🤖 Deactivating AI Companion Interface...");

    setIsListening(false);
    setIsRecording(false);
    await AICompanionService.stopListening();
  };

  const handleVoiceInteraction = async () => {
    if (!isActive) {
      onToggle();
      return;
    }

    try {
      if (isRecording) {
        // Stop recording and process
        const audioUri = await AICompanionService.stopRecording();
        setIsRecording(false);

        if (audioUri) {
          // In a real implementation, you'd send this to a speech-to-text service
          // For now, we'll simulate user interaction with common questions
          const responses = [
            "How am I doing?",
            "Where's my next turn?",
            "Am I safe?",
            "How much further?",
          ];
          const simulatedUserInput =
            responses[Math.floor(Math.random() * responses.length)];
          const response =
            AICompanionService.generateContextualResponse(simulatedUserInput);

          await AICompanionService.speak(response);
          setLastInteractionTime(Date.now());
        }
      } else {
        // Start recording
        const recording = await AICompanionService.startRecording();
        if (recording) {
          setIsRecording(true);
          await AICompanionService.speak("I'm listening...");

          // Auto-stop recording after 5 seconds for demo
          setTimeout(async () => {
            if (isRecording) {
              await handleVoiceInteraction();
            }
          }, 5000);
        } else {
          // Recording failed, provide fallback interaction
          console.log("🎤 Recording failed, providing fallback response");
          const fallbackResponse =
            AICompanionService.generateContextualResponse(
              "How can you help me?"
            );
          await AICompanionService.speak(fallbackResponse);
          setLastInteractionTime(Date.now());
        }
      }
    } catch (error) {
      console.error("❌ Voice interaction error:", error);
      setIsRecording(false);

      // Provide fallback response instead of just showing error
      try {
        const fallbackResponse = AICompanionService.generateContextualResponse(
          "I'm having trouble with voice input"
        );
        await AICompanionService.speak(
          "I'm having trouble with voice input, but I'm still here to help you. How can I assist you?"
        );
        setLastInteractionTime(Date.now());
      } catch (speechError) {
        console.error("❌ Fallback speech error:", speechError);
        Alert.alert(
          "AI Companion Error",
          "Voice features are temporarily unavailable, but I can still provide navigation assistance."
        );
      }
    }
  };

  const handlePress = () => {
    if (!isActive) {
      onToggle();
    } else {
      // Provide quick status update
      const response = AICompanionService.generateContextualResponse();
      AICompanionService.speak(response);
      setLastInteractionTime(Date.now());
    }
  };

  return (
    <TouchableOpacity
      style={[styles.companionButton, isActive && styles.companionButtonActive]}
      onPress={handlePress}
      onLongPress={handleVoiceInteraction}
    >
      <Ionicons
        name={isRecording ? "mic" : isActive ? "mic" : "mic-off"}
        size={24}
        color={isActive ? COLORS.white : COLORS.mutedTeal}
      />
      <Text
        style={[styles.companionText, isActive && styles.companionTextActive]}
      >
        {isRecording ? "Recording" : isActive ? "AI On" : "AI Off"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  companionButton: {
    position: "absolute",
    top: SPACING.xl * 4 + 80, // Position below SOS button (70px height + 10px spacing)
    right: SPACING.md,
    backgroundColor: COLORS.warmBeige,
    borderWidth: 2,
    borderColor: COLORS.mutedTeal,
    width: 70,
    height: 70,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000, // Ensure button appears above other elements
    elevation: 5, // Android elevation for visibility
    ...SHADOWS.medium,
  },
  companionButtonActive: {
    backgroundColor: COLORS.mutedTeal,
    borderColor: COLORS.mutedTeal,
  },
  companionText: {
    color: COLORS.mutedTeal,
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
    marginTop: 2,
  },
  companionTextActive: {
    color: COLORS.white,
  },
});
