/**
 * AI Companion Service Usage Example
 * Demonstrates how to use the enhanced AI companion with contextual conversations
 */

import { AICompanionService } from '../services/AICompanionService';

// Example of how to integrate the AI companion into your app
export class AICompanionUsageExample {
  
  // Initialize and start the AI companion
  static async startAICompanion() {
    try {
      // Initialize the AI companion
      const initialized = await AICompanionService.initialize();
      if (!initialized) {
        console.log("Failed to initialize AI companion");
        return;
      }

      // Start listening for conversations
      await AICompanionService.startListening();
      
      console.log("✅ AI Companion is now active and ready for conversations!");
      
    } catch (error) {
      console.error("Failed to start AI companion:", error);
    }
  }

  // Update location context (call this when user's location changes)
  static updateLocationContext(locationData) {
    AICompanionService.updateContext({
      currentLocation: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      },
      locationName: locationData.locationName || "Current Area",
      nearbyPlaces: locationData.nearbyPlaces || [],
      nearbySpots: locationData.nearbySpots || [],
    });
  }

  // Update navigation context (call this when route starts/updates)
  static updateNavigationContext(navigationData) {
    AICompanionService.updateContext({
      isNavigating: navigationData.isNavigating,
      selectedRoute: navigationData.route,
      nextTurn: navigationData.nextTurn,
      routeProgress: navigationData.progress,
    });
  }

  // Example: Simulate a complete journey with AI conversations
  static async simulateJourney() {
    console.log("🚗 Starting simulated journey with AI companion...");
    
    // Start AI companion
    await this.startAICompanion();
    
    // Simulate location updates
    setTimeout(() => {
      this.updateLocationContext({
        latitude: 37.7749,
        longitude: -122.4194,
        locationName: "Downtown San Francisco",
        nearbyPlaces: [
          { name: "Blue Bottle Coffee", type: "cafe" },
          { name: "Tartine Bakery", type: "restaurant" },
          { name: "Union Square", type: "landmark" }
        ],
        nearbySpots: [
          { name: "SFPD Central Station", type: "police" },
          { name: "UCSF Medical Center", type: "hospital" }
        ]
      });
    }, 5000);

    // Simulate starting navigation
    setTimeout(() => {
      this.updateNavigationContext({
        isNavigating: true,
        route: { name: "Route to Golden Gate Park" },
        nextTurn: {
          instruction: "turn left onto Market Street",
          distance: "500 meters"
        },
        progress: 10
      });
    }, 15000);

    // Simulate navigation progress
    setTimeout(() => {
      this.updateNavigationContext({
        isNavigating: true,
        progress: 50,
        nextTurn: {
          instruction: "turn right onto Fulton Street",
          distance: "200 meters"
        }
      });
    }, 45000);

    // Simulate arrival
    setTimeout(() => {
      this.updateNavigationContext({
        isNavigating: false,
        progress: 100,
        nextTurn: null
      });
      
      AICompanionService.speak("Congratulations! You've arrived at your destination. I hope you enjoyed our conversation during the journey!");
    }, 75000);
  }

  // Stop the AI companion
  static async stopAICompanion() {
    await AICompanionService.stopListening();
    await AICompanionService.cleanup();
    console.log("🤐 AI Companion has been stopped");
  }
}

// Example usage in a React Native component:
/*
import { AICompanionUsageExample } from './examples/AICompanionUsage';

// In your component
const handleStartJourney = async () => {
  await AICompanionUsageExample.startAICompanion();
};

// When location updates
useEffect(() => {
  if (userLocation) {
    AICompanionUsageExample.updateLocationContext({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      locationName: userLocation.address,
      nearbyPlaces: nearbyBusinesses,
      nearbySpots: safePlaces
    });
  }
}, [userLocation, nearbyBusinesses, safePlaces]);

// When navigation starts
const handleStartNavigation = (route) => {
  AICompanionUsageExample.updateNavigationContext({
    isNavigating: true,
    route: route,
    nextTurn: route.steps[0],
    progress: 0
  });
};
*/
