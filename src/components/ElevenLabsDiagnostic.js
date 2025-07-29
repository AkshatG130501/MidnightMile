import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { ELEVEN_LABS_CONFIG } from '../config/ElevenLabsConfig';
import { ElevenLabsTTSService } from '../services/ElevenLabsTTSService';
import Constants from 'expo-constants';

/**
 * ElevenLabs Diagnostic Component
 * Helps debug TTS configuration and API connection issues
 */
const ElevenLabsDiagnostic = ({ visible, onClose }) => {
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (visible) {
      runDiagnostic();
    }
  }, [visible]);

  const runDiagnostic = () => {
    try {
      const debugInfo = ELEVEN_LABS_CONFIG.debugConfig();
      const envInfo = {
        hasExpoConfig: !!Constants.expoConfig,
        hasExtra: !!Constants.expoConfig?.extra,
        allExtraKeys: Object.keys(Constants.expoConfig?.extra || {}),
        elevenLabsKey: Constants.expoConfig?.extra?.ELEVEN_LABS_API_KEY,
        elevenLabsVoice: Constants.expoConfig?.extra?.ELEVEN_LABS_VOICE_ID,
      };

      setDiagnosticData({
        ...debugInfo,
        ...envInfo,
        isConfigured: ELEVEN_LABS_CONFIG.isConfigured(),
        serviceInitialized: ElevenLabsTTSService.isInitialized,
      });
    } catch (error) {
      Alert.alert('Diagnostic Error', error.message);
    }
  };

  const testApiConnection = async () => {
    setTesting(true);
    try {
      // First try to initialize
      const initialized = ElevenLabsTTSService.initializeFromConfig();
      if (!initialized) {
        Alert.alert('Test Failed', 'Could not initialize ElevenLabs service');
        return;
      }

      // Then test connection
      const connectionTest = await ElevenLabsTTSService.testConnection();
      if (connectionTest) {
        Alert.alert('Success!', 'ElevenLabs API connection is working correctly');
      } else {
        Alert.alert('Connection Failed', 'Could not connect to ElevenLabs API');
      }
    } catch (error) {
      Alert.alert('Test Error', error.message);
    } finally {
      setTesting(false);
    }
  };

  const testTTS = async () => {
    setTesting(true);
    try {
      const success = await ElevenLabsTTSService.speak("Testing ElevenLabs text to speech");
      if (success) {
        Alert.alert('TTS Test', 'Text-to-speech test completed successfully!');
      } else {
        Alert.alert('TTS Test Failed', 'Could not generate speech');
      }
    } catch (error) {
      Alert.alert('TTS Error', error.message);
    } finally {
      setTesting(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>ElevenLabs Diagnostic</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.deepNavy} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {diagnosticData && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Configuration Status</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Is Configured:</Text>
                  <Text style={[styles.value, diagnosticData.isConfigured ? styles.success : styles.error]}>
                    {diagnosticData.isConfigured ? 'YES' : 'NO'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Service Initialized:</Text>
                  <Text style={[styles.value, diagnosticData.serviceInitialized ? styles.success : styles.error]}>
                    {diagnosticData.serviceInitialized ? 'YES' : 'NO'}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>API Key Info</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Has API Key:</Text>
                  <Text style={[styles.value, diagnosticData.hasApiKey ? styles.success : styles.error]}>
                    {diagnosticData.hasApiKey ? 'YES' : 'NO'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Key Length:</Text>
                  <Text style={styles.value}>{diagnosticData.keyLength}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Valid Format (sk_):</Text>
                  <Text style={[styles.value, diagnosticData.isValidFormat ? styles.success : styles.error]}>
                    {diagnosticData.isValidFormat ? 'YES' : 'NO'}
                  </Text>
                </View>
                {diagnosticData.elevenLabsKey && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Key Preview:</Text>
                    <Text style={styles.value}>
                      {diagnosticData.elevenLabsKey.substring(0, 8)}...
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Environment Info</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Has Expo Config:</Text>
                  <Text style={[styles.value, diagnosticData.hasExpoConfig ? styles.success : styles.error]}>
                    {diagnosticData.hasExpoConfig ? 'YES' : 'NO'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Has Extra Section:</Text>
                  <Text style={[styles.value, diagnosticData.hasExtra ? styles.success : styles.error]}>
                    {diagnosticData.hasExtra ? 'YES' : 'NO'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Voice ID:</Text>
                  <Text style={styles.value}>{diagnosticData.voiceId || 'Not set'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Extra Keys:</Text>
                  <Text style={styles.value}>{diagnosticData.allExtraKeys?.join(', ') || 'None'}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={runDiagnostic}
              disabled={testing}
            >
              <Ionicons name="refresh" size={20} color={COLORS.white} />
              <Text style={styles.actionText}>Refresh Diagnostic</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={testApiConnection}
              disabled={testing}
            >
              <Ionicons name="cloud" size={20} color={COLORS.white} />
              <Text style={styles.actionText}>Test API Connection</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={testTTS}
              disabled={testing || !diagnosticData?.isConfigured}
            >
              <Ionicons name="volume-high" size={20} color={COLORS.white} />
              <Text style={styles.actionText}>Test TTS</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    backgroundColor: COLORS.white,
    width: '90%',
    maxHeight: '80%',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutralGray + '20',
  },
  title: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutralGray + '10',
  },
  label: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    flex: 1,
  },
  value: {
    fontSize: FONTS.sizes.small,
    color: COLORS.deepNavy,
    fontWeight: FONTS.weights.medium,
    flex: 1,
    textAlign: 'right',
  },
  success: {
    color: COLORS.safeGreen,
  },
  error: {
    color: COLORS.alertRed,
  },
  actions: {
    marginTop: SPACING.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.mutedTeal,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  actionText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    marginLeft: SPACING.sm,
  },
});

export default ElevenLabsDiagnostic;
