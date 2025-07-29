/**
 * AICompanionInterface Component
 * Provides the UI interface for the AI companion with voice controls
 * Maintains original button styling and position
 */

import React, { useState, useEffect, useRef } from "react";
import { Text, TouchableOpacity, StyleSheet, Alert, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../constants/theme";
import { AICompanionService } from "../services/AICompanionService";
import { SpeechToTextService } from "../services/SpeechToTextService";
import { IntelligentAIService } from "../services/IntelligentAIService";

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
  const [recording, setRecording] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const spinValue = useRef(new Animated.Value(0)).current;

  // Animation for processing state
  useEffect(() => {
    if (isProcessing) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => spinAnimation.stop();
    } else {
      spinValue.setValue(0);
    }
  }, [isProcessing, spinValue]);

  // Check permissions
  useEffect(() => {
    checkPermissions();
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      // Initialize STT service
      SpeechToTextService.initialize();
      
      // Initialize AI service
      IntelligentAIService.initialize();
      
      console.log("✅ All AI services initialized for AICompanionInterface");
    } catch (error) {
      console.error("❌ Failed to initialize AI services:", error);
    }
  };

  const checkPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === "granted");

      if (status !== "granted") {
        Alert.alert(
          "Microphone Permission Required",
          "This feature requires microphone access to record audio. Please enable it in your device settings.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
      Alert.alert("Error", "Failed to request microphone permissions");
    }
  };

  // Update AI context when props change - with debouncing and significant change detection
  useEffect(() => {
    const updateContext = () => {
      AICompanionService.updateContext({
        currentLocation,
        selectedRoute,
        nextTurn,
        routeProgress,
        isNavigating,
        nearbySpots,
      });
    };

    // Only update if there are significant changes
    const hasSignificantLocationChange = (() => {
      if (!currentLocation?.coords) return false;
      
      const lastContext = AICompanionService.context;
      if (!lastContext.currentLocation?.coords) return true;
      
      // Calculate distance between old and new location
      const latDiff = Math.abs(currentLocation.coords.latitude - lastContext.currentLocation.coords.latitude);
      const lonDiff = Math.abs(currentLocation.coords.longitude - lastContext.currentLocation.coords.longitude);
      
      // Only update if moved more than ~10 meters (0.0001 degrees ≈ 11 meters)
      return latDiff > 0.0001 || lonDiff > 0.0001;
    })();

    const hasNavigationStateChange = isNavigating !== AICompanionService.context.isNavigating;
    const hasRouteChange = selectedRoute?.id !== AICompanionService.context.selectedRoute?.id;
    const hasNextTurnChange = nextTurn?.instruction !== AICompanionService.context.nextTurn?.instruction;
    
    // Only update if there are significant changes
    if (hasSignificantLocationChange || hasNavigationStateChange || hasRouteChange || hasNextTurnChange) {
      // Debounce context updates to prevent spam
      const timeoutId = setTimeout(updateContext, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [
    currentLocation?.coords?.latitude,
    currentLocation?.coords?.longitude,
    selectedRoute?.id,
    nextTurn?.instruction,
    routeProgress,
    isNavigating,
    nearbySpots?.length,
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
      if (recording) {
        recording.stopAndUnloadAsync();
      }
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

    if (!hasPermission) {
      await checkPermissions();
      return;
    }

    if (isRecording) {
      // Stop recording
      await stopRecording();
    } else {
      // Start recording
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      // Pause AI speech to prevent interference
      AICompanionService.pauseAISpeechForRecording();

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create new recording instance with format optimized for STT
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert(
        "Recording Error",
        "Failed to start recording. Please try again."
      );
      // Resume AI speech if recording failed
      AICompanionService.resumeAISpeechAfterRecording();
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      // Stop and unload recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecording(null);
      setIsRecording(false);
      setIsProcessing(true);

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log("🎤 Recording stopped, starting STT → AI → TTS pipeline...");

      // Step 1: Convert speech to text
      console.log("🔄 Step 1: Converting speech to text...");
      const transcribedText = await SpeechToTextService.transcribeAudio(uri);
      
      if (!transcribedText) {
        Alert.alert("Speech Recognition", "Sorry, I couldn't understand what you said. Please try speaking more clearly.");
        setIsProcessing(false);
        // Resume AI speech if STT failed
        AICompanionService.resumeAISpeechAfterRecording();
        return;
      }

      console.log("✅ Transcribed text:", transcribedText);

      // Step 2: Generate AI response with context
      console.log("🔄 Step 2: Generating AI response...");
      const contextualInfo = {
        currentLocation,
        selectedRoute,
        userInput: transcribedText,
        isNavigating,
        timeOfDay: new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"
      };

      const aiResponse = await IntelligentAIService.generateResponse(transcribedText, contextualInfo);
      
      if (!aiResponse) {
        Alert.alert("AI Error", "Sorry, I'm having trouble processing your request right now.");
        setIsProcessing(false);
        // Resume AI speech if AI generation failed
        AICompanionService.resumeAISpeechAfterRecording();
        return;
      }

      console.log("✅ AI response generated:", aiResponse);

      // Step 3: Convert AI response to speech using AICompanionService
      console.log("🔄 Step 3: Converting AI response to speech...");
      setIsAISpeaking(true);
      setIsProcessing(false);

      // Use AICompanionService for consistent speech management
      const speechSuccess = await AICompanionService.speak(aiResponse, {
        priority: 'recording-response' // This will bypass the pause check
      });

      if (!speechSuccess) {
        Alert.alert("Speech Error", "Generated response but couldn't convert to speech.");
      }

      setIsAISpeaking(false);
      setLastInteractionTime(Date.now());
      
      // Resume AI speech after the response is complete
      AICompanionService.resumeAISpeechAfterRecording();
      
      console.log("✅ STT → AI → TTS pipeline completed successfully!");

    } catch (error) {
      console.error("Failed to process audio:", error);
      Alert.alert("Processing Error", "Failed to process your audio. Please try again.");
      setIsProcessing(false);
      setIsAISpeaking(false);
      // Resume AI speech if processing failed
      AICompanionService.resumeAISpeechAfterRecording();
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
      style={[
        styles.companionButton, 
        isActive && styles.companionButtonActive,
        isRecording && styles.companionButtonRecording,
        isProcessing && styles.companionButtonProcessing,
        isAISpeaking && styles.companionButtonSpeaking,
      ]}
      onPress={handlePress}
      onLongPress={handleVoiceInteraction}
      disabled={isProcessing || isAISpeaking}
    >
      <Animated.View
        style={[
          isProcessing && {
            transform: [{
              rotate: spinValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            }],
          },
        ]}
      >
        <Ionicons
          name={
            isProcessing 
              ? "sync" 
              : isAISpeaking 
                ? "volume-high" 
                : isRecording 
                  ? "stop" 
                  : isActive 
                    ? "mic" 
                    : "mic-off"
          }
          size={24}
          color={isActive || isRecording || isProcessing || isAISpeaking ? COLORS.white : COLORS.mutedTeal}
        />
      </Animated.View>
      <Text
        style={[styles.companionText, isActive && styles.companionTextActive]}
      >
        {isProcessing 
          ? "Processing" 
          : isAISpeaking 
            ? "Speaking" 
            : isRecording 
              ? "Recording" 
              : isActive 
                ? "AI On" 
                : "AI Off"}
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
  companionButtonRecording: {
    backgroundColor: COLORS.softCoral,
    borderColor: COLORS.softCoral,
  },
  companionButtonProcessing: {
    backgroundColor: COLORS.safetyAmber,
    borderColor: COLORS.safetyAmber,
  },
  companionButtonSpeaking: {
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
