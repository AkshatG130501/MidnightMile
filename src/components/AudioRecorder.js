import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";

const { width } = Dimensions.get("window");

export default function AudioRecorder({ onRecordingComplete, style }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedURI, setRecordedURI] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const soundRef = useRef(null);
  const durationTimer = useRef(null);

  useEffect(() => {
    checkPermissions();
    return () => {
      // Cleanup on unmount
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

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

  const startRecording = async () => {
    if (!hasPermission) {
      await checkPermissions();
      return;
    }

    try {
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create new recording instance
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordedURI(null);

      // Start duration timer
      durationTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert(
        "Recording Error",
        "Failed to start recording. Please try again."
      );
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      // Clear duration timer
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
        durationTimer.current = null;
      }

      // Stop and unload recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecordedURI(uri);
      setRecording(null);
      setIsRecording(false);

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Notify parent component
      if (onRecordingComplete) {
        onRecordingComplete(uri, recordingDuration);
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Recording Error", "Failed to stop recording properly.");
    }
  };

  const playRecording = async () => {
    if (!recordedURI) return;

    try {
      // If already playing, stop first
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Create and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: recordedURI },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setIsPlaying(true);

      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (error) {
      console.error("Failed to play recording:", error);
      Alert.alert("Playback Error", "Failed to play the recording.");
      setIsPlaying(false);
    }
  };

  const stopPlayback = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlaying(false);
      } catch (error) {
        console.error("Failed to stop playback:", error);
      }
    }
  };

  const deleteRecording = () => {
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this recording?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (isPlaying) {
              stopPlayback();
            }
            setRecordedURI(null);
            setRecordingDuration(0);
          },
        },
      ]
    );
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!hasPermission) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="mic-off" size={48} color={COLORS.slateGray} />
          <Text style={styles.permissionText}>
            Microphone permission is required for audio recording
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={checkPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Recording Controls */}
      <View style={styles.recordingSection}>
        <View style={styles.recordButton}>
          <TouchableOpacity
            style={[
              styles.recordButtonInner,
              isRecording && styles.recordingActive,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isPlaying}
          >
            <Ionicons
              name={isRecording ? "stop" : "mic"}
              size={32}
              color={isRecording ? COLORS.white : COLORS.deepNavy}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.recordingInfo}>
          <Text style={styles.recordingStatus}>
            {isRecording
              ? "Recording..."
              : recordedURI
              ? "Recording Ready"
              : "Tap to Record"}
          </Text>
          {(isRecording || recordedURI) && (
            <Text style={styles.duration}>
              {formatDuration(recordingDuration)}
            </Text>
          )}
        </View>
      </View>

      {/* Playback Controls */}
      {recordedURI && (
        <View style={styles.playbackSection}>
          <TouchableOpacity
            style={[styles.playButton, isPlaying && styles.playingActive]}
            onPress={isPlaying ? stopPlayback : playRecording}
            disabled={isRecording}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={24}
              color={isPlaying ? COLORS.white : COLORS.deepNavy}
            />
            <Text
              style={[
                styles.playButtonText,
                isPlaying && styles.playButtonTextActive,
              ]}
            >
              {isPlaying ? "Stop" : "Play Recording"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={deleteRecording}
            disabled={isRecording || isPlaying}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.softCoral} />
          </TouchableOpacity>
        </View>
      )}

      {/* Recording Tips */}
      {!isRecording && !recordedURI && (
        <View style={styles.tipsSection}>
          <Text style={styles.tipsText}>
            💡 For best quality, record in a quiet environment
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
    shadowColor: COLORS.deepNavy,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  permissionText: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    textAlign: "center",
    marginVertical: SPACING.md,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: COLORS.deepNavy,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  permissionButtonText: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.white,
  },
  recordingSection: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  recordButton: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  recordButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.warmBeige,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.deepNavy,
  },
  recordingActive: {
    backgroundColor: COLORS.softCoral,
    borderColor: COLORS.softCoral,
  },
  recordingInfo: {
    alignItems: "center",
  },
  recordingStatus: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.xs,
  },
  duration: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.mutedTeal,
  },
  playbackSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.warmBeige,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.warmBeige,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flex: 1,
    marginRight: SPACING.md,
  },
  playingActive: {
    backgroundColor: COLORS.mutedTeal,
  },
  playButtonText: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginLeft: SPACING.sm,
  },
  playButtonTextActive: {
    color: COLORS.white,
  },
  deleteButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.warmBeige,
  },
  tipsSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.warmBeige,
  },
  tipsText: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    textAlign: "center",
    fontStyle: "italic",
  },
});
