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
import HomeScreen from "./src/screens/HomeScreen";
import ContactsScreen from "./src/screens/ContactsScreen";
import SafeSpotsScreen from "./src/screens/SafeSpotsScreen";
import QuickHelpScreen from "./src/screens/QuickHelpScreen";

// Import constants
import { COLORS } from "./src/constants/theme";

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
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    // Handle OAuth redirect URLs
    const handleUrl = (url) => {
      if (url.includes('midnightmile://auth')) {
        // OAuth callback will be handled by the WebBrowser session
        console.log('OAuth redirect received:', url);
      }
    };

    // Listen for URL events
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor={COLORS.white} />
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
