import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";
import { AuthService } from "../services/AuthService";

export default function SignUpScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, signInWithGoogle, signInWithApple, loading } = useAuth();

  const handleSignUp = async () => {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    try {
      const result = await signUp(email.trim(), password, fullName.trim());

      if (result.success) {
        // Don't navigate manually - let AuthContext handle it
        // The navigation will happen automatically when user state updates
      } else {
        Alert.alert("Sign Up Failed", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  const handleGoogleSignUp = async () => {
    console.log("SignUpScreen: Starting Google Sign Up");
    try {
      const result = await AuthService.signInWithGoogle();
      console.log("SignUpScreen: Google Sign Up result:", result);

      if (result.success && result.data?.url) {
        console.log("SignUpScreen: Opening OAuth URL:", result.data.url);

        // Open the OAuth URL in the browser with both possible redirect schemes
        const browserResult = await WebBrowser.openAuthSessionAsync(
          result.data.url,
          ["midnightmile://auth", "exp://"]
        );

        console.log("SignUpScreen: Browser result:", browserResult);

        if (browserResult.type === "success") {
          console.log(
            "SignUpScreen: OAuth completed successfully, URL:",
            browserResult.url
          );
          // The auth state will be updated automatically via the deep link handler
        } else if (browserResult.type === "cancel") {
          console.log("SignUpScreen: User cancelled OAuth");
          Alert.alert("Sign Up Cancelled", "Google sign up was cancelled.");
        } else {
          console.log(
            "SignUpScreen: OAuth failed or dismissed:",
            browserResult
          );
          // Don't show error for "dismiss" type as it might still be successful
          if (browserResult.type !== "dismiss") {
            Alert.alert(
              "Sign Up Failed",
              "Google sign up failed. Please try again."
            );
          }
        }
      } else {
        console.error("SignUpScreen: Google Sign Up failed:", result.error);
        Alert.alert(
          "Google Sign Up Failed",
          result.error || "Unknown error occurred"
        );
      }
    } catch (error) {
      console.error("SignUpScreen: Google Sign Up error:", error);
      Alert.alert("Error", "Google sign up failed. Please try again.");
    }
  };

  const handleAppleSignUp = async () => {
    console.log("SignUpScreen: Starting Apple Sign Up");
    try {
      const result = await AuthService.signInWithApple();
      console.log("SignUpScreen: Apple Sign Up result:", result);

      if (result.success && result.data?.url) {
        console.log("SignUpScreen: Opening OAuth URL:", result.data.url);

        // Open the OAuth URL in the browser with both possible redirect schemes
        const browserResult = await WebBrowser.openAuthSessionAsync(
          result.data.url,
          ["midnightmile://auth", "exp://"]
        );

        console.log("SignUpScreen: Browser result:", browserResult);

        if (browserResult.type === "success") {
          console.log(
            "SignUpScreen: OAuth completed successfully, URL:",
            browserResult.url
          );
          // The auth state will be updated automatically via the deep link handler
        } else if (browserResult.type === "cancel") {
          console.log("SignUpScreen: User cancelled OAuth");
          Alert.alert("Sign Up Cancelled", "Apple sign up was cancelled.");
        } else {
          console.log(
            "SignUpScreen: OAuth failed or dismissed:",
            browserResult
          );
          // Don't show error for "dismiss" type as it might still be successful
          if (browserResult.type !== "dismiss") {
            Alert.alert(
              "Sign Up Failed",
              "Apple sign up failed. Please try again."
            );
          }
        }
      } else {
        console.error("SignUpScreen: Apple Sign Up failed:", result.error);
        Alert.alert(
          "Apple Sign Up Failed",
          result.error || "Unknown error occurred"
        );
      }
    } catch (error) {
      console.error("SignUpScreen: Apple Sign Up error:", error);
      Alert.alert("Error", "Apple sign up failed. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.deepNavy} />
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join us for a safer journey</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.slateGray}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.slateGray}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Create a password"
                  placeholderTextColor={COLORS.slateGray}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={COLORS.slateGray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm your password"
                  placeholderTextColor={COLORS.slateGray}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color={COLORS.slateGray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.signUpButton, loading && styles.disabledButton]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.signUpButtonText}>
                {loading ? "Creating Account..." : "Create Account"}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignUp}
                disabled={loading}
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
                onPress={handleAppleSignUp}
                disabled={loading}
              >
                <Ionicons name="logo-apple" size={20} color={COLORS.deepNavy} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.warmBeige,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.xxlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.deepNavy,
    fontFamily: FONTS.headline,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    fontFamily: FONTS.body,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.medium,
    color: COLORS.deepNavy,
    fontFamily: FONTS.body,
    marginBottom: SPACING.sm,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.neutralGray,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    fontSize: FONTS.sizes.medium,
    fontFamily: FONTS.body,
    color: COLORS.deepNavy,
    backgroundColor: COLORS.white,
    ...SHADOWS.light,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.neutralGray,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    ...SHADOWS.light,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: SPACING.md,
    fontSize: FONTS.sizes.medium,
    fontFamily: FONTS.body,
    color: COLORS.deepNavy,
  },
  eyeButton: {
    padding: SPACING.sm,
  },
  signUpButton: {
    height: 50,
    backgroundColor: COLORS.mutedTeal,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signUpButtonText: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.white,
    fontFamily: FONTS.body,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.neutralGray,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    fontFamily: FONTS.body,
  },
  socialButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.xl,
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
    ...SHADOWS.light,
  },
  socialButtonText: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.deepNavy,
    fontFamily: FONTS.body,
    marginLeft: SPACING.sm,
  },
  loginPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  loginPromptText: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    fontFamily: FONTS.body,
  },
  loginLink: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.mutedTeal,
    fontFamily: FONTS.body,
  },
});
