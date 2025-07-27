import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  Image,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";
import { AuthService } from "../services/AuthService";

const { width, height } = Dimensions.get("window");

export default function LandingScreen({ navigation }) {
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  const [showTapHint, setShowTapHint] = useState(false);
  const logoTranslateY = new Animated.Value(0);
  const authOptionsOpacity = new Animated.Value(0);
  const authOptionsTranslateY = new Animated.Value(50);

  useEffect(() => {
    console.log("LandingScreen: Component mounted");

    // Show logo and brand name for 500ms, then start transition
    const timer = setTimeout(() => {
      console.log("LandingScreen: Auto-starting transition after 500ms");
      startTransition();
    }, 500);

    // Fallback: ensure auth options show after 2 seconds regardless
    const fallbackTimer = setTimeout(() => {
      if (!showAuthOptions) {
        console.log(
          "LandingScreen: Fallback timer triggered - showing auth options"
        );
        setShowAuthOptions(true);
      }
    }, 2000);

    // Show tap hint after 3 seconds if nothing happened
    const hintTimer = setTimeout(() => {
      if (!showAuthOptions) {
        console.log("LandingScreen: Showing tap hint after 3 seconds");
        setShowTapHint(true);
      }
    }, 3000);

    return () => {
      console.log("LandingScreen: Cleaning up timers");
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      clearTimeout(hintTimer);
    };
  }, [showAuthOptions]);

  const startTransition = () => {
    console.log("LandingScreen: Starting transition animation");
    setShowAuthOptions(true);

    // Animate logo moving up
    Animated.timing(logoTranslateY, {
      toValue: -height * 0.18,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      console.log("LandingScreen: Logo animation completed");
    });

    // Animate auth options appearing
    Animated.parallel([
      Animated.timing(authOptionsOpacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(authOptionsTranslateY, {
        toValue: 0,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log("LandingScreen: Auth options animation completed");
    });
  };

  const handleLogin = () => {
    console.log("LandingScreen: Navigating to Login screen");
    navigation.navigate("Login");
  };

  const handleSignUp = () => {
    console.log("LandingScreen: Navigating to SignUp screen");
    navigation.navigate("SignUp");
  };

  const handleGoogleSignIn = async () => {
    console.log("LandingScreen: Starting Google Sign In");
    try {
      const result = await AuthService.signInWithGoogle();
      console.log("LandingScreen: Google Sign In result:", result);

      if (result.success && result.data?.url) {
        console.log("LandingScreen: Opening OAuth URL:", result.data.url);

        // Open the OAuth URL in the browser with both possible redirect schemes
        const browserResult = await WebBrowser.openAuthSessionAsync(
          result.data.url,
          ["midnightmile://auth", "exp://"]
        );

        console.log("LandingScreen: Browser result:", browserResult);

        if (browserResult.type === "success") {
          console.log(
            "LandingScreen: OAuth completed successfully, URL:",
            browserResult.url
          );
          // The auth state will be updated automatically via the deep link handler
        } else if (browserResult.type === "cancel") {
          console.log("LandingScreen: User cancelled OAuth");
          Alert.alert("Sign In Cancelled", "Google sign in was cancelled.");
        } else {
          console.log(
            "LandingScreen: OAuth failed or dismissed:",
            browserResult
          );
          // Don't show error for "dismiss" type as it might still be successful
          if (browserResult.type !== "dismiss") {
            Alert.alert(
              "Sign In Failed",
              "Google sign in failed. Please try again."
            );
          }
        }
      } else {
        console.error("LandingScreen: Google Sign In failed:", result.error);
        Alert.alert(
          "Google Sign In Failed",
          result.error || "Unknown error occurred"
        );
      }
    } catch (error) {
      console.error("LandingScreen: Google Sign In error:", error);
      Alert.alert("Error", "Google sign in failed. Please try again.");
    }
  };

  const handleAppleSignIn = async () => {
    console.log("LandingScreen: Starting Apple Sign In");
    try {
      const result = await AuthService.signInWithApple();
      console.log("LandingScreen: Apple Sign In result:", result);

      if (result.success && result.data?.url) {
        console.log("LandingScreen: Opening OAuth URL:", result.data.url);

        // Open the OAuth URL in the browser with both possible redirect schemes
        const browserResult = await WebBrowser.openAuthSessionAsync(
          result.data.url,
          ["midnightmile://auth", "exp://"]
        );

        console.log("LandingScreen: Browser result:", browserResult);

        if (browserResult.type === "success") {
          console.log(
            "LandingScreen: OAuth completed successfully, URL:",
            browserResult.url
          );
          // The auth state will be updated automatically via the deep link handler
        } else if (browserResult.type === "cancel") {
          console.log("LandingScreen: User cancelled OAuth");
          Alert.alert("Sign In Cancelled", "Apple sign in was cancelled.");
        } else {
          console.log(
            "LandingScreen: OAuth failed or dismissed:",
            browserResult
          );
          // Don't show error for "dismiss" type as it might still be successful
          if (browserResult.type !== "dismiss") {
            Alert.alert(
              "Sign In Failed",
              "Apple sign in failed. Please try again."
            );
          }
        }
      } else {
        console.error("LandingScreen: Apple Sign In failed:", result.error);
        Alert.alert(
          "Apple Sign In Failed",
          result.error || "Unknown error occurred"
        );
      }
    } catch (error) {
      console.error("LandingScreen: Apple Sign In error:", error);
      Alert.alert("Error", "Apple sign in failed. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated Logo and Brand Section */}
        <TouchableOpacity
          style={styles.logoSectionTouchable}
          onPress={() => {
            if (!showAuthOptions) {
              console.log(
                "LandingScreen: User tapped logo - starting transition"
              );
              startTransition();
            } else {
              console.log(
                "LandingScreen: User tapped logo but auth options already showing"
              );
            }
          }}
          activeOpacity={showAuthOptions ? 1 : 0.7}
        >
          <Animated.View
            style={[
              styles.logoSection,
              {
                transform: [{ translateY: logoTranslateY }],
              },
            ]}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>Midnight Mile</Text>
            <Text style={styles.tagline}>Security in every step.</Text>

            {/* Show tap hint if needed */}
            {showTapHint && !showAuthOptions && (
              <Text style={styles.tapHint}>Tap to continue</Text>
            )}
          </Animated.View>
        </TouchableOpacity>

        {/* Auth Options - Only show after transition */}
        {showAuthOptions && (
          <Animated.View
            style={[
              styles.authContainer,
              {
                opacity: authOptionsOpacity,
                transform: [{ translateY: authOptionsTranslateY }],
              },
            ]}
          >
            {/* Features Section */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Ionicons name="map" size={24} color={COLORS.deepNavy} />
                <Text style={styles.featureText}>Safe route mapping</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons
                  name="chatbubbles"
                  size={24}
                  color={COLORS.deepNavy}
                />
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
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleGoogleSignIn}
                >
                  <Ionicons
                    name="logo-google"
                    size={20}
                    color={COLORS.deepNavy}
                  />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleAppleSignIn}
                >
                  <Ionicons
                    name="logo-apple"
                    size={20}
                    color={COLORS.deepNavy}
                  />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
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
    paddingTop: SPACING.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  logoSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoSectionTouchable: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
    shadowColor: COLORS.deepNavy,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
  },
  brandName: {
    fontSize: FONTS.sizes.xxlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.xs,
    fontFamily: FONTS.headline,
    textAlign: "center",
  },
  tagline: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    fontFamily: FONTS.body,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  authContainer: {
    position: "absolute",
    bottom: height * 0.08,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    maxHeight: height * 0.6,
  },
  featuresContainer: {
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    shadowColor: COLORS.deepNavy,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  featureText: {
    fontSize: FONTS.sizes.medium - 1,
    color: COLORS.deepNavy,
    marginLeft: SPACING.sm,
    fontFamily: FONTS.body,
  },
  buttonContainer: {
    marginBottom: SPACING.sm,
  },
  button: {
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
    shadowColor: COLORS.deepNavy,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginTop: SPACING.sm,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.xs,
    shadowColor: COLORS.deepNavy,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonText: {
    color: COLORS.deepNavy,
    fontSize: FONTS.sizes.medium,
    marginLeft: SPACING.sm,
    fontFamily: FONTS.body,
  },
  tapHint: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.medium,
    color: COLORS.mutedTeal,
    fontFamily: FONTS.body,
    opacity: 0.7,
  },
});
