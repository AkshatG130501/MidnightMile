import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AICompanionInterface from "../components/AICompanionInterface";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";

/**
 * Test screen for the hold-to-record AI companion functionality
 */
export default function AICompanionTest() {
  const [isAIActive, setIsAIActive] = useState(false);

  // Mock data for testing
  const mockLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
    address: "123 Market St, San Francisco, CA",
  };

  const mockNearbySpots = [
    {
      id: 1,
      name: "Central Police Station",
      type: "police",
      distance: "0.3 miles",
    },
    {
      id: 2,
      name: "UCSF Medical Center",
      type: "hospital",
      distance: "0.7 miles",
    },
  ];

  const mockNextTurn = {
    instruction: "Turn right onto Pine Street",
    distance: "500 feet",
  };

  const handleToggleAI = () => {
    setIsAIActive(!isAIActive);
    console.log("🤖 AI Companion toggled:", !isAIActive);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Companion Test</Text>
        <Text style={styles.subtitle}>Hold-to-Record Voice Interface</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>AI Companion Status</Text>
          <View style={styles.statusRow}>
            <Ionicons
              name={isAIActive ? "checkmark-circle" : "close-circle"}
              size={20}
              color={isAIActive ? COLORS.safeGreen : COLORS.slateGray}
            />
            <Text style={styles.statusText}>
              {isAIActive ? "Active & Listening" : "Inactive"}
            </Text>
          </View>
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.cardTitle}>How to Use</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionStep}>1.</Text>
            <Text style={styles.instructionText}>
              Tap the AI button to activate the companion
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionStep}>2.</Text>
            <Text style={styles.instructionText}>
              <Text style={styles.highlight}>Hold down</Text> the AI button to
              start recording
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionStep}>3.</Text>
            <Text style={styles.instructionText}>
              Speak your question while holding the button
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionStep}>4.</Text>
            <Text style={styles.instructionText}>
              <Text style={styles.highlight}>Release</Text> the button to stop
              recording
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionStep}>5.</Text>
            <Text style={styles.instructionText}>
              AI will play back your recording, then respond
            </Text>
          </View>
        </View>

        <View style={styles.mockDataCard}>
          <Text style={styles.cardTitle}>Mock Navigation Data</Text>
          <Text style={styles.mockDataText}>
            📍 Location: {mockLocation.address}
          </Text>
          <Text style={styles.mockDataText}>
            🚔 {mockNearbySpots[0].name} - {mockNearbySpots[0].distance}
          </Text>
          <Text style={styles.mockDataText}>
            🏥 {mockNearbySpots[1].name} - {mockNearbySpots[1].distance}
          </Text>
          <Text style={styles.mockDataText}>
            ➡️ Next: {mockNextTurn.instruction}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.toggleButton, isAIActive && styles.toggleButtonActive]}
          onPress={handleToggleAI}
        >
          <Ionicons
            name={isAIActive ? "pause" : "play"}
            size={20}
            color={COLORS.white}
          />
          <Text style={styles.toggleButtonText}>
            {isAIActive ? "Deactivate AI" : "Activate AI"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Companion Interface */}
      <AICompanionInterface
        isActive={isAIActive}
        onToggle={handleToggleAI}
        currentLocation={mockLocation}
        selectedRoute={null}
        nextTurn={mockNextTurn}
        routeProgress={35}
        isNavigating={true}
        nearbySpots={mockNearbySpots}
      />
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
  statusCard: {
    backgroundColor: COLORS.warmBeige,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    marginLeft: SPACING.sm,
  },
  instructionsCard: {
    backgroundColor: COLORS.mutedTeal,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
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
    color: COLORS.white,
    marginRight: SPACING.sm,
    minWidth: 20,
  },
  instructionText: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    color: COLORS.white,
    flex: 1,
    lineHeight: 20,
  },
  highlight: {
    fontWeight: FONTS.weights.bold,
    textDecorationLine: "underline",
  },
  mockDataCard: {
    backgroundColor: COLORS.warmBeige,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  mockDataText: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    marginBottom: SPACING.xs,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.slateGray,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.mutedTeal,
  },
  toggleButtonText: {
    fontFamily: FONTS.body,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
});
