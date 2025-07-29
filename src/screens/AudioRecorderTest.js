import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import AudioRecorder from "../components/AudioRecorder";
import { COLORS, FONTS, SPACING } from "../constants/theme";

/**
 * Simple test screen for audio recording functionality
 * Use this to quickly test the AudioRecorder component
 */
export default function AudioRecorderTest() {
  const handleRecordingComplete = (uri, duration) => {
    console.log("✅ Recording completed!");
    console.log("📄 URI:", uri);
    console.log("⏱️ Duration:", duration, "seconds");

    // Here you could save to state, send to server, etc.
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Audio Recorder Test</Text>
        <Text style={styles.subtitle}>
          Test the audio recording functionality
        </Text>
      </View>

      <View style={styles.content}>
        <AudioRecorder onRecordingComplete={handleRecordingComplete} />

        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>Test Steps:</Text>
          <Text style={styles.instruction}>1. Grant microphone permission</Text>
          <Text style={styles.instruction}>2. Tap record button to start</Text>
          <Text style={styles.instruction}>3. Speak for a few seconds</Text>
          <Text style={styles.instruction}>
            4. Tap stop to finish recording
          </Text>
          <Text style={styles.instruction}>
            5. Use play button to test audio
          </Text>
          <Text style={styles.instruction}>6. Check console for output</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.warmBeige,
  },
  title: {
    fontFamily: FONTS.headline,
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  instructions: {
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: COLORS.warmBeige,
    borderRadius: 12,
  },
  instructionTitle: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.md,
  },
  instruction: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
});
