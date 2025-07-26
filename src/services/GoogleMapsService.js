import * as Location from "expo-location";
import Constants from "expo-constants";

export class GoogleMapsService {
  static apiKey =
    Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    "YOUR_GOOGLE_MAPS_API_KEY_HERE";

  // Get directions between two points
  static async getDirections(origin, destination, mode = "walking") {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr =
        typeof destination === "string"
          ? destination
          : `${destination.latitude},${destination.longitude}`;

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=${mode}&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        return data.routes;
      } else {
        throw new Error(data.error_message || "Failed to get directions");
      }
    } catch (error) {
      console.error("Error getting directions:", error);
      throw error;
    }
  }

  // Get multiple route alternatives with safety scoring
  static async getSafeRoutes(origin, destination) {
    try {
      const routes = await this.getDirections(origin, destination, "walking");

      // Add safety scoring to each route
      const safeRoutes = routes.map((route, index) => {
        const safetyScore = this.calculateSafetyScore(route);
        return {
          ...route,
          id: index,
          safetyScore,
          safetyLevel: this.getSafetyLevel(safetyScore),
          estimatedTime: route.legs[0].duration.text,
          distance: route.legs[0].distance.text,
        };
      });

      // Sort by safety score (highest first)
      return safeRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
    } catch (error) {
      console.error("Error getting safe routes:", error);
      throw error;
    }
  }

  // Calculate safety score based on route characteristics
  static calculateSafetyScore(route) {
    let score = 50; // Base score

    // Analyze route steps for safety factors
    route.legs[0].steps.forEach((step) => {
      const instruction = step.html_instructions.toLowerCase();

      // Positive factors
      if (instruction.includes("main") || instruction.includes("avenue"))
        score += 10;
      if (instruction.includes("plaza") || instruction.includes("center"))
        score += 5;

      // Negative factors
      if (instruction.includes("alley") || instruction.includes("back"))
        score -= 15;
      if (instruction.includes("under") || instruction.includes("tunnel"))
        score -= 10;
    });

    // Distance factor (shorter routes are generally safer for walking)
    const distance = route.legs[0].distance.value; // in meters
    if (distance < 1000) score += 20;
    else if (distance > 3000) score -= 10;

    // Time factor (routes that take too long might be less safe)
    const duration = route.legs[0].duration.value; // in seconds
    if (duration > 1800) score -= 15; // More than 30 minutes

    return Math.max(0, Math.min(100, score));
  }

  // Get safety level based on score
  static getSafetyLevel(score) {
    if (score >= 70) return "HIGH";
    if (score >= 40) return "MEDIUM";
    return "LOW";
  }

  // Geocode an address to coordinates
  static async geocodeAddress(address) {
    try {
      console.log(`🔍 Geocoding address: "${address}"`);

      // First try: Direct geocoding
      let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${this.apiKey}`;

      let response = await fetch(url);
      let data = await response.json();

      console.log(`🌐 Geocoding API response status: ${data.status}`);

      if (data.status === "OK" && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const result = {
          latitude: location.lat,
          longitude: location.lng,
          address: data.results[0].formatted_address,
        };
        console.log(
          `✅ Geocoding successful: ${result.address} (${result.latitude}, ${result.longitude})`
        );
        return result;
      }

      // Second try: Add region bias for India (since coordinates suggest India)
      console.log(`🔄 Retrying geocoding with region bias...`);
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&region=in&key=${this.apiKey}`;

      response = await fetch(url);
      data = await response.json();

      console.log(
        `🌐 Geocoding API response status (with region): ${data.status}`
      );

      if (data.status === "OK" && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const result = {
          latitude: location.lat,
          longitude: location.lng,
          address: data.results[0].formatted_address,
        };
        console.log(
          `✅ Geocoding successful with region bias: ${result.address}`
        );
        return result;
      }

      // Third try: Add more context if it seems to be a local landmark
      if (
        !address.toLowerCase().includes("india") &&
        !address.toLowerCase().includes("jaipur")
      ) {
        console.log(`🔄 Retrying geocoding with city context...`);
        const contextualAddress = `${address}, Jaipur, Rajasthan, India`;
        url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          contextualAddress
        )}&key=${this.apiKey}`;

        response = await fetch(url);
        data = await response.json();

        console.log(
          `🌐 Geocoding API response status (with context): ${data.status}`
        );

        if (data.status === "OK" && data.results.length > 0) {
          const location = data.results[0].geometry.location;
          const result = {
            latitude: location.lat,
            longitude: location.lng,
            address: data.results[0].formatted_address,
          };
          console.log(
            `✅ Geocoding successful with context: ${result.address}`
          );
          return result;
        }
      }

      // If all attempts fail
      console.error(
        `❌ Geocoding failed for "${address}". API Status: ${data.status}`
      );
      if (data.error_message) {
        console.error(`📝 API Error: ${data.error_message}`);
      }

      throw new Error(
        `Location "${address}" not found. Please try a more specific address.`
      );
    } catch (error) {
      console.error("Error geocoding address:", error);
      throw error;
    }
  }

  // Get nearby places (safe spots)
  static async getNearbyPlaces(location, type = "police", radius = 2000) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=${radius}&type=${type}&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        return data.results.map((place) => ({
          id: place.place_id,
          name: place.name,
          coordinate: {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
          },
          distance: this.calculateDistance(location, place.geometry.location),
          rating: place.rating || 0,
        }));
      } else {
        throw new Error(data.error_message || "Failed to get nearby places");
      }
    } catch (error) {
      console.error("Error getting nearby places:", error);
      throw error;
    }
  }

  // Google Places Autocomplete
  static async getPlaceAutocomplete(input, location = null, radius = 50000) {
    try {
      if (!input || input.length < 2) {
        return [];
      }

      console.log(`🔍 Getting autocomplete suggestions for: "${input}"`);

      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&key=${this.apiKey}`;

      // Add location bias if available
      if (location) {
        url += `&location=${location.latitude},${location.longitude}&radius=${radius}`;
      }

      // Add components filter for better regional results
      url += `&components=country:in`; // Assuming India based on coordinates seen earlier

      const response = await fetch(url);
      const data = await response.json();

      console.log(`🌐 Autocomplete API response status: ${data.status}`);

      if (data.status === "OK") {
        const suggestions = data.predictions.map((prediction) => ({
          place_id: prediction.place_id,
          description: prediction.description,
          main_text:
            prediction.structured_formatting?.main_text ||
            prediction.description,
          secondary_text:
            prediction.structured_formatting?.secondary_text || "",
          types: prediction.types,
        }));

        console.log(`✅ Found ${suggestions.length} autocomplete suggestions`);
        return suggestions;
      } else if (data.status === "ZERO_RESULTS") {
        console.log("📝 No autocomplete results found");
        return [];
      } else {
        console.error(`❌ Autocomplete API error: ${data.status}`);
        throw new Error(
          data.error_message || "Failed to get autocomplete suggestions"
        );
      }
    } catch (error) {
      console.error("Error getting place autocomplete:", error);
      return []; // Return empty array instead of throwing to gracefully handle errors
    }
  }

  // Get place details by place_id
  static async getPlaceDetails(placeId) {
    try {
      console.log(`🔍 Getting place details for: ${placeId}`);

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,name&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        const place = data.result;
        const result = {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          address: place.formatted_address,
          name: place.name,
        };

        console.log(
          `✅ Place details retrieved: ${result.name} - ${result.address}`
        );
        return result;
      } else {
        throw new Error(data.error_message || "Failed to get place details");
      }
    } catch (error) {
      console.error("Error getting place details:", error);
      throw error;
    }
  }

  // Calculate distance between two points
  static calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
        Math.cos(this.toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance < 1
      ? `${Math.round(distance * 1000)}m`
      : `${distance.toFixed(1)}km`;
  }

  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Determine if it's currently day or night based on time
  static isDayTime() {
    const now = new Date();
    const hour = now.getHours();

    // Consider it daytime between 6 AM and 8 PM
    // You can adjust these hours based on your preference
    const dayStartHour = 6;
    const dayEndHour = 20;

    return hour >= dayStartHour && hour < dayEndHour;
  }

  // Get appropriate map theme based on time of day
  static getMapTheme() {
    return this.isDayTime() ? "light" : "night";
  }

  // Decode polyline for route display
  static decodePolyline(encoded) {
    const points = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  }
}
