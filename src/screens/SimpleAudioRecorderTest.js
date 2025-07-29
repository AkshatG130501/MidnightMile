import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import SimpleAudioRecorder from "../components/SimpleAudioRecorder";
import { COLORS, FONTS, SPACING } from "../constants/theme";

export default function SimpleAudioRecorderTest() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Simple Audio Recorder</Text>
          <Text style={styles.subtitle}>
            Tap the microphone to start/stop recording, then tap play to hear your recording
          </Text>
        </View>

        <View style={styles.recorderContainer}>
          <SimpleAudioRecorder />
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to use:</Text>
          <Text style={styles.instruction}>
            🎤 <Text style={styles.bold}>Microphone Button:</Text> Tap to start recording, tap again to stop
          </Text>
          <Text style={styles.instruction}>
            ▶️ <Text style={styles.bold}>Play Button:</Text> Tap to play your recorded audio
          </Text>
          <Text style={styles.note}>
            Note: The play button will be disabled until you record something
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
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  title: {
    fontFamily: FONTS.headline,
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    textAlign: "center",
    lineHeight: 22,
  },
  recorderContainer: {
    backgroundColor: COLORS.warmBeige,
    borderRadius: 20,
    padding: SPACING.xl,
    marginVertical: SPACING.xl,
    alignItems: "center",
    shadowColor: COLORS.deepNavy,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  instructionsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.warmBeige,
  },
  instructionsTitle: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.md,
  },
  instruction: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  bold: {
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
  },
  note: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.small,
    color: COLORS.mutedTeal,
    fontStyle: "italic",
    marginTop: SPACING.sm,
  },
});
