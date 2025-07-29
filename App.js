import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Linking } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";

// Import screens
import LandingScreen from "./src/screens/LandingScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ContactsScreen from "./src/screens/ContactsScreen";
import SafeSpotsScreen from "./src/screens/SafeSpotsScreen";
import QuickHelpScreen from "./src/screens/QuickHelpScreen";
import SimpleAudioRecorderTest from "./src/screens/SimpleAudioRecorderTest";

// Import constants and context
import { COLORS } from "./src/constants/theme";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { LoadingSpinner } from "./src/components/LoadingSpinner";
import { supabase } from "./src/config/supabase";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Map") {
            iconName = focused ? "map" : "map-outline";
          } else if (route.name === "Contacts") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Safe Spots") {
            iconName = focused
              ? "shield-checkmark"
              : "shield-checkmark-outline";
          } else if (route.name === "Quick Help") {
            iconName = focused ? "medical" : "medical-outline";
          } else if (route.name === "Audio Test") {
            iconName = focused ? "mic" : "mic-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.mutedTeal,
        tabBarInactiveTintColor: COLORS.slateGray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.warmBeige,
          paddingTop: 8,
          paddingBottom: 8,
          height: 65,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Map" component={HomeScreen} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="Safe Spots" component={SafeSpotsScreen} />
      <Tab.Screen name="Quick Help" component={QuickHelpScreen} />
      <Tab.Screen name="Audio Test" component={SimpleAudioRecorderTest} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, initializing } = useAuth();

  useEffect(() => {
    const handleUrl = async (url) => {
      console.log("App.js: Processing URL:", url);

      if (
        url.includes("midnightmile://auth") ||
        url.includes("#access_token")
      ) {
        console.log("App.js: OAuth redirect detected");

        try {
          // Check if this is a hash-based OAuth response (access_token in fragment)
          if (url.includes("#access_token")) {
            console.log("App.js: Hash-based OAuth detected, parsing tokens");

            // Parse the URL fragment for OAuth tokens
            const fragment = url.split("#")[1];
            const params = new URLSearchParams(fragment);

            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");
            const expiresIn = params.get("expires_in");

            if (accessToken && refreshToken) {
              console.log("App.js: Setting session with parsed tokens");

              // Set the session directly with the tokens
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (error) {
                console.error("App.js: Error setting session:", error.message);
              } else {
                console.log("App.js: Session set successfully:", data);
              }
            } else {
              console.error(
                "App.js: Missing required tokens in OAuth response"
              );
            }
          } else {
            // Standard authorization code flow
            const urlParams = new URL(url);
            const code = urlParams.searchParams.get("code");

            if (code) {
              console.log("App.js: Found auth code, exchanging for session");

              const { data, error } =
                await supabase.auth.exchangeCodeForSession(url);

              if (error) {
                console.error(
                  "App.js: Error exchanging code for session:",
                  error.message
                );
              } else {
                console.log("App.js: Session exchange successful:", data);
              }
            } else {
              console.log("App.js: No auth code found in URL");
            }
          }
        } catch (error) {
          console.error("App.js: Error processing OAuth redirect:", error);
        }
      }
    };

    const subscription = Linking.addEventListener("url", (event) => {
      console.log("App.js: Deep link received:", event.url);
      handleUrl(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("App.js: Initial URL found:", url);
        handleUrl(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  if (initializing) {
    return (
      <NavigationContainer>
        <StatusBar style="dark" backgroundColor={COLORS.white} />
        <LoadingSpinner text="Loading Midnight Mile..." />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor={COLORS.white} />
      <Stack.Navigator
        initialRouteName={user ? "Main" : "Landing"}
        screenOptions={{
          headerShown: false,
        }}
      >
        {user ? (
          // Authenticated stack
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          // Unauthenticated stack
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
