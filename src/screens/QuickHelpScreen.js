import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../constants/theme";

export default function QuickHelpScreen() {
  const [isSOSActive, setIsSOSActive] = useState(false);

  const emergencyContacts = [
    {
      name: "Police",
      number: "911",
      icon: "shield-checkmark",
      color: COLORS.deepNavy,
    },
    {
      name: "Fire Department",
      number: "911",
      icon: "flame",
      color: COLORS.warningRed,
    },
    {
      name: "Medical Emergency",
      number: "911",
      icon: "medical",
      color: COLORS.safetyAmber,
    },
    {
      name: "Crisis Hotline",
      number: "988",
      icon: "chatbubbles",
      color: COLORS.mutedTeal,
    },
  ];

  const quickActions = [
    {
      id: 1,
      title: "Share Location",
      subtitle: "Send your current location to trusted contacts",
      icon: "location",
      color: COLORS.mutedTeal,
      action: () => handleShareLocation(),
    },
    {
      id: 2,
      title: "Safety Check-in",
      subtitle: "Let your contacts know you're safe",
      icon: "checkmark-circle",
      color: COLORS.safeGreen,
      action: () => handleSafetyCheckin(),
    },
    {
      id: 3,
      title: "Request Pickup",
      subtitle: "Ask someone to come get you",
      icon: "car",
      color: COLORS.safetyAmber,
      action: () => handleRequestPickup(),
    },
    {
      id: 4,
      title: "Fake Call",
      subtitle: "Simulate receiving an important call",
      icon: "call",
      color: COLORS.slateGray,
      action: () => handleFakeCall(),
    },
  ];

  const safetyTips = [
    "Trust your instincts - if something feels wrong, it probably is",
    "Stay aware of your surroundings and avoid distractions",
    "Walk confidently and make eye contact with people around you",
    "Keep your phone charged and share your location with trusted contacts",
    "Plan your route in advance and stick to well-lit, busy areas",
  ];

  const handleEmergencyCall = (number) => {
    Alert.alert("Emergency Call", `Call ${number}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Call", onPress: () => Linking.openURL(`tel:${number}`) },
    ]);
  };

  const handleSOS = () => {
    if (isSOSActive) {
      setIsSOSActive(false);
      Alert.alert("SOS Cancelled", "Emergency alert has been cancelled.");
    } else {
      setIsSOSActive(true);
      Alert.alert(
        "SOS ACTIVATED",
        "Emergency alert sent to all trusted contacts. Emergency services will be contacted if you don't cancel within 10 seconds.",
        [
          {
            text: "Cancel SOS",
            onPress: () => setIsSOSActive(false),
            style: "cancel",
          },
          { text: "Continue", style: "destructive" },
        ]
      );
    }
  };

  const handleShareLocation = () => {
    Alert.alert(
      "Location Shared",
      "Your current location has been sent to all trusted contacts."
    );
  };

  const handleSafetyCheckin = () => {
    Alert.alert(
      "Check-in Sent",
      "Safety check-in message sent to trusted contacts."
    );
  };

  const handleRequestPickup = () => {
    Alert.alert(
      "Pickup Requested",
      "Pickup request sent to trusted contacts with your location."
    );
  };

  const handleFakeCall = () => {
    Alert.alert("Fake Call", "Simulating incoming call...");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quick Help</Text>
          <Text style={styles.headerSubtitle}>
            Emergency assistance and safety tools
          </Text>
        </View>

        {/* SOS Button */}
        <View style={styles.sosSection}>
          <TouchableOpacity
            style={[styles.sosButton, isSOSActive && styles.sosButtonActive]}
            onPress={handleSOS}
          >
            <Ionicons name="warning" size={40} color={COLORS.white} />
            <Text style={styles.sosText}>
              {isSOSActive ? "CANCEL SOS" : "SOS EMERGENCY"}
            </Text>
            <Text style={styles.sosSubtext}>
              {isSOSActive
                ? "Tap to cancel alert"
                : "Hold for 3 seconds to activate"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <View style={styles.emergencyGrid}>
            {emergencyContacts.map((contact, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.emergencyCard,
                  { borderLeftColor: contact.color },
                ]}
                onPress={() => handleEmergencyCall(contact.number)}
              >
                <Ionicons name={contact.icon} size={24} color={contact.color} />
                <Text style={styles.emergencyName}>{contact.name}</Text>
                <Text style={styles.emergencyNumber}>{contact.number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={action.action}
              >
                <View
                  style={[styles.actionIcon, { backgroundColor: action.color }]}
                >
                  <Ionicons name={action.icon} size={24} color={COLORS.white} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.slateGray}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Safety Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          <View style={styles.tipsContainer}>
            {safetyTips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Ionicons name="bulb" size={16} color={COLORS.safetyAmber} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Additional Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          <TouchableOpacity style={styles.resourceCard}>
            <Ionicons name="document-text" size={24} color={COLORS.mutedTeal} />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Safety Guidelines</Text>
              <Text style={styles.resourceSubtitle}>
                Learn more about staying safe
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resourceCard}>
            <Ionicons name="settings" size={24} color={COLORS.mutedTeal} />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Emergency Settings</Text>
              <Text style={styles.resourceSubtitle}>
                Configure your safety preferences
              </Text>
            </View>
          </TouchableOpacity>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.warmBeige,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.deepNavy,
    fontFamily: FONTS.headline,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
  },
  sosSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xl,
    alignItems: "center",
  },
  sosButton: {
    backgroundColor: COLORS.warningRed,
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.heavy,
  },
  sosButtonActive: {
    backgroundColor: COLORS.safetyAmber,
  },
  sosText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.bold,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  sosSubtext: {
    color: COLORS.white,
    fontSize: FONTS.sizes.small,
    textAlign: "center",
    marginTop: SPACING.xs,
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.md,
  },
  emergencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  emergencyCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 4,
    marginBottom: SPACING.sm,
    alignItems: "center",
    ...SHADOWS.light,
  },
  emergencyName: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  emergencyNumber: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    marginTop: SPACING.xs,
  },
  actionsContainer: {
    gap: SPACING.sm,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.light,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
  },
  tipsContainer: {
    gap: SPACING.md,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.warmBeige,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  tipText: {
    flex: 1,
    fontSize: FONTS.sizes.small,
    color: COLORS.deepNavy,
    marginLeft: SPACING.sm,
    lineHeight: 18,
  },
  resourceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.light,
  },
  resourceContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  resourceTitle: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginBottom: 2,
  },
  resourceSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
  },
});
