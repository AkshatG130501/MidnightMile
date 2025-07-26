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
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";
import { AuthService } from "../services/AuthService";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.signIn(email.trim(), password);

      if (result.success) {
        // Navigate to main app
        navigation.replace("Main");
      } else {
        Alert.alert("Login Failed", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await AuthService.signInWithGoogle();

      if (result.success) {
        navigation.replace("Main");
      } else {
        Alert.alert("Google Sign In Failed", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Google sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const result = await AuthService.signInWithApple();

      if (result.success) {
        navigation.replace("Main");
      } else {
        Alert.alert("Apple Sign In Failed", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Apple sign in failed. Please try again.");
    } finally {
      setLoading(false);
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
              onPress={() => {
                /* Navigate to forgot password */
              }}
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
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.neutralGray,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
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
