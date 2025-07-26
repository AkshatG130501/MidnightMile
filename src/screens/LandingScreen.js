import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";

const { width, height } = Dimensions.get("window");

export default function LandingScreen({ navigation }) {
  const handleLogin = () => {
    // For now, navigate directly to main app
    // In a real app, this would handle authentication
    navigation.replace("Main");
  };

  const handleSignUp = () => {
    // For now, navigate directly to main app
    // In a real app, this would handle registration
    navigation.replace("Main");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons
              name="shield-checkmark"
              size={60}
              color={COLORS.mutedTeal}
            />
          </View>
          <Text style={styles.brandName}>Midnight Mile</Text>
          <Text style={styles.tagline}>Security in every step.</Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="map" size={24} color={COLORS.deepNavy} />
            <Text style={styles.featureText}>Safe route mapping</Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="chatbubbles" size={24} color={COLORS.deepNavy} />
            <Text style={styles.featureText}>AI companion support</Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="people" size={24} color={COLORS.deepNavy} />
            <Text style={styles.featureText}>Trusted contacts alerts</Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={COLORS.deepNavy}
            />
            <Text style={styles.featureText}>Auto check-in reminders</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleLogin}
          >
            <Text style={styles.primaryButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleSignUp}
          >
            <Text style={styles.secondaryButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-google" size={20} color={COLORS.deepNavy} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-apple" size={20} color={COLORS.deepNavy} />
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: height * 0.1,
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  brandName: {
    fontSize: FONTS.sizes.xxlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.sm,
    fontFamily: FONTS.headline,
  },
  tagline: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    fontFamily: FONTS.body,
    textAlign: "center",
  },
  featuresContainer: {
    marginVertical: SPACING.xl,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  featureText: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.deepNavy,
    marginLeft: SPACING.md,
    fontFamily: FONTS.body,
  },
  buttonContainer: {
    marginBottom: SPACING.xl,
  },
  button: {
    height: 50,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.mutedTeal,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    fontFamily: FONTS.body,
  },
  secondaryButton: {
    backgroundColor: COLORS.warmBeige,
    borderWidth: 1,
    borderColor: COLORS.deepNavy,
  },
  secondaryButtonText: {
    color: COLORS.deepNavy,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    fontFamily: FONTS.body,
  },
  socialButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.xs,
  },
  socialButtonText: {
    color: COLORS.deepNavy,
    fontSize: FONTS.sizes.medium,
    marginLeft: SPACING.sm,
    fontFamily: FONTS.body,
  },
});
