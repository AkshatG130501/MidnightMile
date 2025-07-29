import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { SpeechToTextService } from "../services/SpeechToTextService";
import { IntelligentAIService } from "../services/IntelligentAIService";
import { ElevenLabsTTSService } from "../services/ElevenLabsTTSService";
import { AICompanionService } from "../services/AICompanionService";

export default function SimpleAudioRecorder({ style, currentLocation, selectedRoute }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedURI, setRecordedURI] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPermissions();
    initializeServices();
    return () => {
      // Cleanup on unmount
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

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

  const initializeServices = async () => {
    try {
      // Initialize STT service
      SpeechToTextService.initialize();
      
      // Initialize AI service
      IntelligentAIService.initialize();
      
      // Initialize TTS service
      ElevenLabsTTSService.initializeFromConfig();
      
      console.log("✅ All AI services initialized for SimpleAudioRecorder");
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

  const toggleRecording = async () => {
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
      setRecordedURI(null); // Clear previous recording
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

      setRecordedURI(uri);
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
        isNavigating: !!selectedRoute,
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

  return (
    <View style={[styles.container, style]}>
      {/* Microphone Button */}
      <TouchableOpacity
        style={[
          styles.micButton,
          isRecording && styles.micButtonRecording,
          isProcessing && styles.micButtonProcessing,
          isAISpeaking && styles.micButtonSpeaking,
        ]}
        onPress={toggleRecording}
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
                    : "mic"
            }
            size={24}
            color={
              isRecording || isProcessing || isAISpeaking 
                ? COLORS.white 
                : COLORS.deepNavy
            }
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  micButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.warmBeige,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.deepNavy,
    shadowColor: COLORS.deepNavy,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  micButtonRecording: {
    backgroundColor: COLORS.softCoral,
    borderColor: COLORS.softCoral,
  },
  micButtonProcessing: {
    backgroundColor: COLORS.safetyAmber,
    borderColor: COLORS.safetyAmber,
  },
  micButtonSpeaking: {
    backgroundColor: COLORS.mutedTeal,
    borderColor: COLORS.mutedTeal,
  },
});
