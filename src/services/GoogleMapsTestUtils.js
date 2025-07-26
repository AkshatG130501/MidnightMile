import { GoogleMapsService } from "./GoogleMapsService";

// Utility functions to test Google Maps API integration
export class GoogleMapsTestUtils {
  // Test if API key is properly configured
  static testApiKeyConfiguration() {
    const apiKey = GoogleMapsService.apiKey;

    if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
      console.warn("❌ Google Maps API key not configured");
      return false;
    }

    if (apiKey.length < 30) {
      console.warn("❌ Google Maps API key appears to be invalid (too short)");
      return false;
    }

    console.log("✅ Google Maps API key is configured");
    return true;
  }

  // Test geocoding functionality
  static async testGeocoding(
    address = "1600 Amphitheatre Parkway, Mountain View, CA"
  ) {
    try {
      console.log(`🔍 Testing geocoding for: ${address}`);
      const result = await GoogleMapsService.geocodeAddress(address);
      console.log("✅ Geocoding test successful:", result);
      return result;
    } catch (error) {
      console.error("❌ Geocoding test failed:", error.message);
      return null;
    }
  }

  // Test directions functionality
  static async testDirections() {
    try {
      const origin = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco
      const destination = { latitude: 37.7849, longitude: -122.4094 }; // Nearby location

      console.log("🗺️ Testing directions API...");
      const routes = await GoogleMapsService.getDirections(origin, destination);
      console.log(
        "✅ Directions test successful, routes found:",
        routes.length
      );
      return routes;
    } catch (error) {
      console.error("❌ Directions test failed:", error.message);
      return null;
    }
  }

  // Test nearby places functionality
  static async testNearbyPlaces() {
    try {
      const location = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco

      console.log("🏥 Testing nearby places API...");
      const places = await GoogleMapsService.getNearbyPlaces(
        location,
        "hospital",
        1000
      );
      console.log(
        "✅ Nearby places test successful, places found:",
        places.length
      );
      return places;
    } catch (error) {
      console.error("❌ Nearby places test failed:", error.message);
      return null;
    }
  }

  // Run all tests
  static async runAllTests() {
    console.log("🧪 Running Google Maps API tests...\n");

    // Test 1: API Key Configuration
    const apiKeyValid = this.testApiKeyConfiguration();
    if (!apiKeyValid) {
      console.log("\n❌ API key test failed - stopping other tests");
      return false;
    }

    // Test 2: Geocoding
    await this.testGeocoding();

    // Wait a bit between API calls
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 3: Directions
    await this.testDirections();

    // Wait a bit between API calls
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 4: Nearby Places
    await this.testNearbyPlaces();

    console.log("\n🎉 Google Maps API tests completed!");
    return true;
  }
}

// Quick test function you can call from the console
export const testGoogleMaps = () => {
  GoogleMapsTestUtils.runAllTests();
};
