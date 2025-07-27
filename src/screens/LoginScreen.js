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

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signInWithGoogle, signInWithApple, loading } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      const result = await signIn(email.trim(), password);

      if (result.success) {
        // Don't navigate manually - let AuthContext handle it
        // The navigation will happen automatically when user state updates
      } else {
        Alert.alert("Login Failed", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    console.log("LoginScreen: Starting Google Sign In");
    try {
      const result = await AuthService.signInWithGoogle();
      console.log("LoginScreen: Google Sign In result:", result);

      if (result.success && result.data?.url) {
        console.log("LoginScreen: Opening OAuth URL:", result.data.url);

        // Open the OAuth URL in the browser with both possible redirect schemes
        const browserResult = await WebBrowser.openAuthSessionAsync(
          result.data.url,
          ["midnightmile://auth", "exp://"]
        );

        console.log("LoginScreen: Browser result:", browserResult);

        if (browserResult.type === "success") {
          console.log(
            "LoginScreen: OAuth completed successfully, URL:",
            browserResult.url
          );
          // The auth state will be updated automatically via the deep link handler
        } else if (browserResult.type === "cancel") {
          console.log("LoginScreen: User cancelled OAuth");
          Alert.alert("Sign In Cancelled", "Google sign in was cancelled.");
        } else {
          console.log("LoginScreen: OAuth failed or dismissed:", browserResult);
          // Don't show error for "dismiss" type as it might still be successful
          if (browserResult.type !== "dismiss") {
            Alert.alert(
              "Sign In Failed",
              "Google sign in failed. Please try again."
            );
          }
        }
      } else {
        console.error("LoginScreen: Google Sign In failed:", result.error);
        Alert.alert(
          "Google Sign In Failed",
          result.error || "Unknown error occurred"
        );
      }
    } catch (error) {
      console.error("LoginScreen: Google Sign In error:", error);
      Alert.alert("Error", "Google sign in failed. Please try again.");
    }
  };

  const handleAppleSignIn = async () => {
    console.log("LoginScreen: Starting Apple Sign In");
    try {
      const result = await AuthService.signInWithApple();
      console.log("LoginScreen: Apple Sign In result:", result);

      if (result.success && result.data?.url) {
        console.log("LoginScreen: Opening OAuth URL:", result.data.url);

        // Open the OAuth URL in the browser with both possible redirect schemes
        const browserResult = await WebBrowser.openAuthSessionAsync(
          result.data.url,
          ["midnightmile://auth", "exp://"]
        );

        console.log("LoginScreen: Browser result:", browserResult);

        if (browserResult.type === "success") {
          console.log(
            "LoginScreen: OAuth completed successfully, URL:",
            browserResult.url
          );
          // The auth state will be updated automatically via the deep link handler
        } else if (browserResult.type === "cancel") {
          console.log("LoginScreen: User cancelled OAuth");
          Alert.alert("Sign In Cancelled", "Apple sign in was cancelled.");
        } else {
          console.log("LoginScreen: OAuth failed or dismissed:", browserResult);
          // Don't show error for "dismiss" type as it might still be successful
          if (browserResult.type !== "dismiss") {
            Alert.alert(
              "Sign In Failed",
              "Apple sign in failed. Please try again."
            );
          }
        }
      } else {
        console.error("LoginScreen: Apple Sign In failed:", result.error);
        Alert.alert(
          "Apple Sign In Failed",
          result.error || "Unknown error occurred"
        );
      }
    } catch (error) {
      console.error("LoginScreen: Apple Sign In error:", error);
      Alert.alert("Error", "Apple sign in failed. Please try again.");
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your safe journey
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
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
                  placeholder="Enter your password"
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

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? "Signing In..." : "Sign In"}
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
                onPress={handleGoogleSignIn}
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
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                <Ionicons name="logo-apple" size={20} color={COLORS.deepNavy} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.signupPrompt}>
              <Text style={styles.signupPromptText}>
                Don't have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                <Text style={styles.signupLink}>Sign Up</Text>
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
    marginBottom: SPACING.xl,
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
    marginBottom: SPACING.lg,
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: SPACING.xl,
  },
  forgotPasswordText: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.mutedTeal,
    fontFamily: FONTS.body,
  },
  loginButton: {
    height: 50,
    backgroundColor: COLORS.mutedTeal,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
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
  signupPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  signupPromptText: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    fontFamily: FONTS.body,
  },
  signupLink: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.mutedTeal,
    fontFamily: FONTS.body,
  },
});
