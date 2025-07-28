import * as Location from "expo-location";
import Constants from "expo-constants";

export class GoogleMapsService {
  static apiKey =
    Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    "YOUR_GOOGLE_MAPS_API_KEY_HERE";

  // Get directions between two points with alternative routes
  static async getDirections(
    origin,
    destination,
    mode = "walking",
    alternatives = true
  ) {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr =
        typeof destination === "string"
          ? destination
          : `${destination.latitude},${destination.longitude}`;

      // Add alternatives parameter to get multiple route options
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=${mode}&alternatives=${alternatives}&key=${this.apiKey}`;

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
      const routes = await this.getDirections(
        origin,
        destination,
        "walking",
        true
      );

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
          routeType: this.getRouteType(route),
        };
      });

      // Sort by safety score (highest first)
      return safeRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
    } catch (error) {
      console.error("Error getting safe routes:", error);
      throw error;
    }
  }

  // Get ALL possible walking routes only
  static async getAllPossibleRoutes(origin, destination) {
    try {
      console.log(
        "🗺️ Getting all possible walking routes with alternatives..."
      );

      // Get multiple sets of routes with different parameters for diversity
      const routeSets = await Promise.all([
        // Standard walking routes
        this.getDirections(origin, destination, "walking", true),
        // Routes avoiding highways (might give more local routes)
        this.getDirectionsWithAvoid(origin, destination, "walking", "highways"),
        // Routes avoiding tolls (might give different paths)
        this.getDirectionsWithAvoid(origin, destination, "walking", "tolls"),
      ]);

      // Combine and deduplicate routes
      let allRoutes = [];
      routeSets.forEach((routes, setIndex) => {
        if (routes && routes.length > 0) {
          routes.forEach((route, routeIndex) => {
            allRoutes.push({
              ...route,
              setOrigin: setIndex, // Track which API call this came from
            });
          });
        }
      });

      // Remove duplicate routes (those with very similar polylines)
      const uniqueRoutes = this.deduplicateRoutes(allRoutes);
      console.log(
        `📊 Found ${allRoutes.length} total routes, ${uniqueRoutes.length} unique routes`
      );

      const processedRoutes = uniqueRoutes.map((route, index) => {
        const safetyScore = this.calculateSafetyScore(route);
        return {
          ...route,
          id: `walking_${index}`,
          mode: "walking",
          safetyScore,
          safetyLevel: this.getSafetyLevel(safetyScore),
          estimatedTime: route.legs[0].duration.text,
          distance: route.legs[0].distance.text,
          routeType: this.getRouteType(route),
          travelMode: "walking",
        };
      });

      // Sort by a combination of safety score and efficiency
      return processedRoutes.sort((a, b) => {
        // Prioritize safety, then duration
        if (a.safetyScore !== b.safetyScore) {
          return b.safetyScore - a.safetyScore;
        }
        return a.legs[0].duration.value - b.legs[0].duration.value;
      });
    } catch (error) {
      console.error("Error getting all possible walking routes:", error);
      // Fallback to basic routes if enhanced method fails
      try {
        const basicRoutes = await this.getDirections(
          origin,
          destination,
          "walking",
          true
        );
        return basicRoutes.map((route, index) => {
          const safetyScore = this.calculateSafetyScore(route);
          return {
            ...route,
            id: `walking_${index}`,
            mode: "walking",
            safetyScore,
            safetyLevel: this.getSafetyLevel(safetyScore),
            estimatedTime: route.legs[0].duration.text,
            distance: route.legs[0].distance.text,
            routeType: this.getRouteType(route),
            travelMode: "walking",
          };
        });
      } catch (fallbackError) {
        console.error("Fallback route fetching also failed:", fallbackError);
        throw fallbackError;
      }
    }
  }

  // Get directions with avoid parameters for more diverse routes
  static async getDirectionsWithAvoid(
    origin,
    destination,
    mode = "walking",
    avoid = ""
  ) {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr =
        typeof destination === "string"
          ? destination
          : `${destination.latitude},${destination.longitude}`;

      // Add avoid parameter for route diversity
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=${mode}&alternatives=true&avoid=${avoid}&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        return data.routes;
      } else {
        console.log(
          `⚠️ Routes with avoid=${avoid} returned status: ${data.status}`
        );
        return []; // Return empty array if this variant fails
      }
    } catch (error) {
      console.error(`Error getting directions with avoid=${avoid}:`, error);
      return []; // Return empty array if this variant fails
    }
  }

  // Remove duplicate routes based on polyline similarity
  static deduplicateRoutes(routes) {
    const uniqueRoutes = [];
    const seenPolylines = new Set();

    routes.forEach((route) => {
      const polyline = route.overview_polyline?.points;
      if (polyline && !seenPolylines.has(polyline)) {
        seenPolylines.add(polyline);
        uniqueRoutes.push(route);
      } else if (!polyline) {
        // If no polyline, check by steps similarity
        const stepsSignature =
          route.legs?.[0]?.steps
            ?.slice(0, 3)
            ?.map((step) => step.html_instructions?.substring(0, 50))
            ?.join("|") || "";

        if (!seenPolylines.has(stepsSignature)) {
          seenPolylines.add(stepsSignature);
          uniqueRoutes.push(route);
        }
      }
    });

    return uniqueRoutes;
  }

  // Determine route type based on characteristics
  static getRouteType(route) {
    const steps = route.legs[0].steps;
    const instructions = steps
      .map((step) => step.html_instructions.toLowerCase())
      .join(" ");

    if (instructions.includes("highway") || instructions.includes("freeway")) {
      return "Highway Route";
    } else if (
      instructions.includes("main") ||
      instructions.includes("avenue")
    ) {
      return "Main Roads";
    } else if (
      instructions.includes("residential") ||
      instructions.includes("street")
    ) {
      return "Local Streets";
    } else if (
      instructions.includes("park") ||
      instructions.includes("trail")
    ) {
      return "Scenic Route";
    }

    return "Standard Route";
  }

  // Calculate safety score based on route characteristics
  static calculateSafetyScore(route) {
    let score = 50; // Base score
    let stepCount = 0;

    // Analyze route steps for safety factors
    route.legs[0].steps.forEach((step) => {
      const instruction = step.html_instructions.toLowerCase();
      stepCount++;

      // Positive factors (well-lit, populated areas)
      if (instruction.includes("main") || instruction.includes("avenue"))
        score += 12;
      if (
        instruction.includes("plaza") ||
        instruction.includes("center") ||
        instruction.includes("square")
      )
        score += 8;
      if (instruction.includes("park") && !instruction.includes("parking"))
        score += 6; // Parks are generally safe during day
      if (instruction.includes("university") || instruction.includes("school"))
        score += 10;
      if (instruction.includes("market") || instruction.includes("shopping"))
        score += 7;

      // Moderate positive factors
      if (instruction.includes("street") || instruction.includes("road"))
        score += 3;
      if (instruction.includes("boulevard") || instruction.includes("drive"))
        score += 5;

      // Negative factors (isolated, potentially unsafe areas)
      if (instruction.includes("alley") || instruction.includes("lane"))
        score -= 18;
      if (
        instruction.includes("under") ||
        instruction.includes("tunnel") ||
        instruction.includes("bridge")
      )
        score -= 15;
      if (
        instruction.includes("industrial") ||
        instruction.includes("warehouse")
      )
        score -= 12;
      if (instruction.includes("parking") || instruction.includes("lot"))
        score -= 8;
      if (instruction.includes("trail") || instruction.includes("path"))
        score -= 5; // Trails can be isolated

      // Turn complexity (more turns = potentially more confusing/unsafe)
      if (
        instruction.includes("turn") ||
        instruction.includes("left") ||
        instruction.includes("right")
      )
        score -= 1;
    });

    // Distance factor (shorter routes are generally safer for walking)
    const distance = route.legs[0].distance.value; // in meters
    if (distance < 500) score += 25; // Very short = very safe
    else if (distance < 1000) score += 20; // Short = safe
    else if (distance < 2000) score += 10; // Medium = moderately safe
    else if (distance > 3000) score -= 15; // Long = less safe
    else if (distance > 5000) score -= 25; // Very long = potentially unsafe

    // Time factor (routes that take too long might be less safe)
    const duration = route.legs[0].duration.value; // in seconds
    if (duration < 600) score += 15; // Under 10 minutes = very safe
    else if (duration < 1200) score += 10; // Under 20 minutes = safe
    else if (duration > 1800) score -= 20; // More than 30 minutes = less safe
    else if (duration > 2700) score -= 35; // More than 45 minutes = potentially unsafe

    // Route complexity factor (fewer steps = simpler navigation = safer)
    if (stepCount < 5) score += 10; // Very simple route
    else if (stepCount < 10) score += 5; // Simple route
    else if (stepCount > 20) score -= 10; // Complex route
    else if (stepCount > 30) score -= 20; // Very complex route

    // Add some randomness to ensure different routes get different scores
    // This helps with filtering even when routes are similar
    const routeSignature =
      route.legs?.[0]?.steps?.[0]?.html_instructions?.length || 0;
    const randomVariation = (routeSignature % 10) - 5; // -5 to +5 variation
    score += randomVariation;

    return Math.max(10, Math.min(100, score)); // Ensure score is between 10-100
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
          distance: this.calculateDistance(location, {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
          }),
          rating: place.rating || 0,
          vicinity:
            place.vicinity ||
            place.formatted_address ||
            "Address not available",
          isOpen: place.opening_hours?.open_now,
          priceLevel: place.price_level,
          types: place.types || [],
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
    // Validate input coordinates
    if (
      !point1 ||
      !point2 ||
      typeof point1.latitude !== "number" ||
      typeof point1.longitude !== "number" ||
      typeof point2.latitude !== "number" ||
      typeof point2.longitude !== "number"
    ) {
      console.warn("Invalid coordinates for distance calculation:", {
        point1,
        point2,
      });
      return "0m";
    }

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

    // Validate the calculated distance
    if (isNaN(distance) || distance < 0) {
      console.warn("Invalid distance calculated:", distance);
      return "0m";
    }

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

  // Get immersive map style for route preview - using pure Google Maps style
  static getImmersiveMapStyle() {
    return null; // Return null to use default Google Maps style
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
