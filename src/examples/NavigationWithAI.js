/**
 * Navigation with AI Integration Example
 * Shows how to integrate the AI companion with navigation features
 */

import { AICompanionService } from "../services/AICompanionService";

export class NavigationWithAI {
  // Example: Start navigation with AI companion
  static async startNavigationWithAI(routeData) {
    try {
      console.log("🚗 Starting navigation with AI companion...");

      // Ensure AI companion is initialized and listening
      if (!AICompanionService.isListening) {
        const initialized = await AICompanionService.initialize();
        if (initialized) {
          await AICompanionService.startListening();
        }
      }

      // Update context with navigation data
      AICompanionService.updateContext({
        isNavigating: true,
        selectedRoute: routeData.route,
        nextTurn: routeData.firstTurn,
        routeProgress: 0,
        locationName: routeData.startLocation,
        nearbyPlaces: routeData.nearbyPlaces || [],
        nearbySpots: routeData.safeSpots || [],
      });

      console.log("✅ Navigation with AI started successfully!");
    } catch (error) {
      console.error("❌ Failed to start navigation with AI:", error);
    }
  }

  // Example: Update navigation progress during journey
  static updateNavigationProgress(progressData) {
    AICompanionService.updateContext({
      routeProgress: progressData.progress,
      nextTurn: progressData.nextTurn,
      currentLocation: progressData.currentLocation,
      locationName: progressData.currentLocationName,
      nearbyPlaces: progressData.nearbyPlaces || [],
      nearbySpots: progressData.safeSpots || [],
    });
  }

  // Example: End navigation
  static async endNavigation() {
    AICompanionService.updateContext({
      isNavigating: false,
      routeProgress: 100,
      nextTurn: null,
      selectedRoute: null,
    });

    console.log("🏁 Navigation ended");
  }

  // Example: Complete navigation flow simulation
  static async simulateNavigationFlow() {
    console.log("🎬 Starting navigation simulation...");

    // Step 1: Start navigation
    await this.startNavigationWithAI({
      route: { name: "Golden Gate Park" },
      firstTurn: {
        instruction: "turn left onto Market Street",
        distance: "500 meters",
      },
      startLocation: "Downtown San Francisco",
      nearbyPlaces: [
        { name: "Blue Bottle Coffee", type: "cafe" },
        { name: "Tartine Bakery", type: "restaurant" },
      ],
      safeSpots: [{ name: "SFPD Central Station", type: "police" }],
    });

    // Step 2: Simulate progress updates every 30 seconds
    const progressUpdates = [
      {
        progress: 15,
        nextTurn: {
          instruction: "turn right onto Fulton Street",
          distance: "800 meters",
        },
        currentLocation: { latitude: 37.7849, longitude: -122.4094 },
        currentLocationName: "Mission District",
      },
      {
        progress: 35,
        nextTurn: {
          instruction: "continue straight on Fulton Street",
          distance: "1.2 kilometers",
        },
        currentLocation: { latitude: 37.7949, longitude: -122.4194 },
        currentLocationName: "Hayes Valley",
      },
      {
        progress: 60,
        nextTurn: {
          instruction: "turn left into Golden Gate Park",
          distance: "300 meters",
        },
        currentLocation: { latitude: 37.8049, longitude: -122.4294 },
        currentLocationName: "Richmond District",
      },
      {
        progress: 85,
        nextTurn: {
          instruction: "arrive at destination on the right",
          distance: "150 meters",
        },
        currentLocation: { latitude: 37.8149, longitude: -122.4394 },
        currentLocationName: "Golden Gate Park",
      },
    ];

    // Apply updates with delays
    progressUpdates.forEach((update, index) => {
      setTimeout(() => {
        console.log(`📍 Navigation update ${index + 1}:`, update);
        this.updateNavigationProgress(update);
      }, (index + 1) * 12000); // Every 30 seconds
    });

    // End navigation after 2.5 minutes
    setTimeout(async () => {
      await this.endNavigation();
      console.log("✅ Navigation simulation completed!");
    }, 150000);
  }
}

// Example React Native component integration:
/*
import React, { useEffect, useState } from 'react';
import { View, Button, Text } from 'react-native';
import { NavigationWithAI } from './examples/NavigationWithAI';

export const NavigationScreen = () => {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleStartNavigation = async () => {
    setIsNavigating(true);
    
    const routeData = {
      route: { name: destinationName },
      firstTurn: nextTurnData,
      startLocation: currentLocationName,
      nearbyPlaces: nearbyBusinesses,
      safeSpots: safePlaces
    };

    await NavigationWithAI.startNavigationWithAI(routeData);
  };

  const handleEndNavigation = async () => {
    await NavigationWithAI.endNavigation();
    setIsNavigating(false);
  };

  // Update progress when location changes
  useEffect(() => {
    if (isNavigating && currentLocation) {
      NavigationWithAI.updateNavigationProgress({
        progress: calculatedProgress,
        nextTurn: nextTurnData,
        currentLocation: currentLocation,
        currentLocationName: locationName,
        nearbyPlaces: nearbyBusinesses,
        safeSpots: safePlaces
      });
    }
  }, [isNavigating, currentLocation, calculatedProgress]);

  return (
    <View>
      <Text>Navigation with AI Companion</Text>
      {!isNavigating ? (
        <Button title="Start Navigation" onPress={handleStartNavigation} />
      ) : (
        <Button title="End Navigation" onPress={handleEndNavigation} />
      )}
    </View>
  );
};
*/

export default NavigationWithAI;
