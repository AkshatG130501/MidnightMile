import { Audio } from "expo-av";
import { Alert, Platform } from "react-native";
import * as FileSystem from "expo-file-system";

export class AudioRecordingService {
  static instance = null;

  constructor() {
    if (AudioRecordingService.instance) {
      return AudioRecordingService.instance;
    }
    AudioRecordingService.instance = this;
  }

  static getInstance() {
    if (!AudioRecordingService.instance) {
      AudioRecordingService.instance = new AudioRecordingService();
    }
    return AudioRecordingService.instance;
  }

  /**
   * Request microphone permissions
   * @returns {Promise<boolean>} - Whether permission was granted
   */
  async requestPermissions() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Error requesting audio permissions:", error);
      return false;
    }
  }

  /**
   * Check if microphone permissions are granted
   * @returns {Promise<boolean>} - Whether permission is granted
   */
  async hasPermissions() {
    try {
      const { status } = await Audio.getPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Error checking audio permissions:", error);
      return false;
    }
  }

  /**
   * Configure audio mode for recording
   * @returns {Promise<void>}
   */
  async configureAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error("Error configuring audio mode:", error);
      throw error;
    }
  }

  /**
   * Reset audio mode after recording
   * @returns {Promise<void>}
   */
  async resetAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error("Error resetting audio mode:", error);
    }
  }

  /**
   * Create a new audio recording
   * @returns {Promise<Audio.Recording>} - Recording instance
   */
  async createRecording() {
    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      return recording;
    } catch (error) {
      console.error("Error creating recording:", error);
      throw error;
    }
  }

  /**
   * Get recording options with custom quality
   * @param {string} quality - 'low', 'medium', 'high'
   * @returns {Object} - Recording options
   */
  getRecordingOptions(quality = "high") {
    const options = {
      low: {
        android: {
          extension: ".m4a",
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MIN,
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      },
      medium: {
        android: {
          extension: ".m4a",
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      },
      high: Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY,
    };

    return options[quality] || options.high;
  }

  /**
   * Save recording to a custom location
   * @param {string} sourceUri - Source recording URI
   * @param {string} filename - Custom filename
   * @returns {Promise<string>} - New file URI
   */
  async saveRecording(sourceUri, filename) {
    try {
      const documentsDir = FileSystem.documentDirectory;
      const recordingsDir = `${documentsDir}recordings/`;

      // Create recordings directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(recordingsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(recordingsDir, {
          intermediates: true,
        });
      }

      const newUri = `${recordingsDir}${filename}`;
      await FileSystem.copyAsync({
        from: sourceUri,
        to: newUri,
      });

      return newUri;
    } catch (error) {
      console.error("Error saving recording:", error);
      throw error;
    }
  }

  /**
   * Delete a recording file
   * @param {string} uri - File URI to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteRecording(uri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting recording:", error);
      return false;
    }
  }

  /**
   * Get all saved recordings
   * @returns {Promise<Array>} - Array of recording file info
   */
  async getSavedRecordings() {
    try {
      const documentsDir = FileSystem.documentDirectory;
      const recordingsDir = `${documentsDir}recordings/`;

      const dirInfo = await FileSystem.getInfoAsync(recordingsDir);
      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(recordingsDir);
      const recordings = [];

      for (const filename of files) {
        const fileUri = `${recordingsDir}${filename}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);

        if (fileInfo.exists) {
          recordings.push({
            uri: fileUri,
            filename,
            size: fileInfo.size,
            modificationTime: fileInfo.modificationTime,
          });
        }
      }

      // Sort by modification time (newest first)
      return recordings.sort((a, b) => b.modificationTime - a.modificationTime);
    } catch (error) {
      console.error("Error getting saved recordings:", error);
      return [];
    }
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} - Formatted size string
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Show permission denied alert
   */
  showPermissionDeniedAlert() {
    Alert.alert(
      "Microphone Permission Required",
      "To use audio recording features, please grant microphone access in your device settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Settings",
          onPress: () => {
            // On iOS, this would open settings
            if (Platform.OS === "ios") {
              // Linking.openURL('app-settings:');
            }
          },
        },
      ]
    );
  }

  /**
   * Validate recording file
   * @param {string} uri - Recording URI
   * @returns {Promise<boolean>} - Whether file is valid
   */
  async validateRecording(uri) {
    try {
      if (!uri) return false;

      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists && fileInfo.size > 0;
    } catch (error) {
      console.error("Error validating recording:", error);
      return false;
    }
  }
}

export default AudioRecordingService;
