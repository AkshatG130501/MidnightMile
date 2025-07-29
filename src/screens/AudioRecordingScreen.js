import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AudioRecorder from "../components/AudioRecorder";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";

export default function AudioRecordingScreen({ navigation }) {
  const [recordings, setRecordings] = useState([]);

  const handleRecordingComplete = (uri, duration) => {
    const newRecording = {
      id: Date.now().toString(),
      uri,
      duration,
      timestamp: new Date().toISOString(),
    };

    setRecordings((prev) => [newRecording, ...prev]);

    Alert.alert(
      "Recording Saved",
      `Your ${Math.floor(duration / 60)}:${(duration % 60)
        .toString()
        .padStart(2, "0")} recording has been saved successfully.`,
      [{ text: "OK" }]
    );
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <Text style={styles.title}>Audio Recording</Text>
        <Text style={styles.subtitle}>
          Record important voice notes and emergency messages
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Audio Recorder Component */}
        <View style={styles.recorderSection}>
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            style={styles.recorder}
          />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>How to Use</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionStep}>1.</Text>
            <Text style={styles.instructionText}>
              Tap the microphone icon to start recording
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionStep}>2.</Text>
            <Text style={styles.instructionText}>
              Tap the stop icon to finish recording
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionStep}>3.</Text>
            <Text style={styles.instructionText}>
              Use the play button to review your recording
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionStep}>4.</Text>
            <Text style={styles.instructionText}>
              Tap the trash icon to delete unwanted recordings
            </Text>
          </View>
        </View>

        {/* Recent Recordings */}
        {recordings.length > 0 && (
          <View style={styles.recordingsSection}>
            <Text style={styles.recordingsTitle}>Recent Recordings</Text>
            {recordings.map((recording) => (
              <View key={recording.id} style={styles.recordingItem}>
                <View style={styles.recordingInfo}>
                  <Text style={styles.recordingDuration}>
                    Duration: {formatDuration(recording.duration)}
                  </Text>
                  <Text style={styles.recordingTime}>
                    {formatTimestamp(recording.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Safety Features Info */}
        <View style={styles.safetySection}>
          <Text style={styles.safetyTitle}>🛡️ Safety Features</Text>
          <Text style={styles.safetyText}>
            • Voice recordings are stored locally on your device{"\n"}• Perfect
            for emergency voice messages{"\n"}• High-quality audio for clear
            communication{"\n"}• No internet connection required
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  title: {
    fontFamily: FONTS.headline,
    fontSize: FONTS.sizes.xxlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  recorderSection: {
    marginBottom: SPACING.lg,
  },
  recorder: {
    // Additional styling can be added here if needed
  },
  instructionsSection: {
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  instructionsTitle: {
    fontFamily: FONTS.headline,
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.md,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  instructionStep: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.bold,
    color: COLORS.mutedTeal,
    marginRight: SPACING.sm,
    minWidth: 20,
  },
  instructionText: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    flex: 1,
    lineHeight: 20,
  },
  recordingsSection: {
    marginBottom: SPACING.lg,
  },
  recordingsTitle: {
    fontFamily: FONTS.headline,
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.md,
  },
  recordingItem: {
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  recordingInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recordingDuration: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
  },
  recordingTime: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
  },
  safetySection: {
    backgroundColor: COLORS.mutedTeal,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  safetyTitle: {
    fontFamily: FONTS.headline,
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  safetyText: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    color: COLORS.white,
    lineHeight: 22,
  },
});
