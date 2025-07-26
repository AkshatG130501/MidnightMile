import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";

export default function LandingScreenSimple({ navigation }) {
  const [showAuthOptions, setShowAuthOptions] = useState(false);

  useEffect(() => {
    console.log("Simple LandingScreen mounted");
    // Show auth options after 2 seconds
    const timer = setTimeout(() => {
      console.log("Timer triggered, showing auth options");
      setShowAuthOptions(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleLogin = () => {
    console.log("Login pressed");
    navigation.navigate("Login");
  };

  const handleSignUp = () => {
    console.log("SignUp pressed");
    navigation.navigate("SignUp");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and Brand */}
        <View style={styles.logoSection}>
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

        {/* Auth Options */}
        {showAuthOptions && (
          <View style={styles.authContainer}>
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleSignUp}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual trigger for testing */}
        {!showAuthOptions && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => setShowAuthOptions(true)}
          >
            <Text style={styles.testButtonText}>Show Auth Options</Text>
          </TouchableOpacity>
        )}
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
    justifyContent: "center",
    alignItems: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  brandName: {
    fontSize: FONTS.sizes.xxlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  tagline: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    textAlign: "center",
  },
  authContainer: {
    width: "100%",
    paddingHorizontal: SPACING.md,
  },
  button: {
    height: 50,
    backgroundColor: COLORS.mutedTeal,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  secondaryButton: {
    backgroundColor: COLORS.warmBeige,
    borderWidth: 1,
    borderColor: COLORS.deepNavy,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
  },
  secondaryButtonText: {
    color: COLORS.deepNavy,
  },
  testButton: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.safetyAmber,
    borderRadius: BORDER_RADIUS.lg,
  },
  testButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
  },
});
