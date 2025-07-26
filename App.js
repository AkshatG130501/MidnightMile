import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

// Import screens
import LandingScreen from "./src/screens/LandingScreen";
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
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
