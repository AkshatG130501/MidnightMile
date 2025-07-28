import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
  AppState,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";

import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  SAFETY_LEVELS,
} from "../constants/theme";
import { GoogleMapsService } from "../services/GoogleMapsService";
import { GoogleMapsTestUtils } from "../services/GoogleMapsTestUtils";
import { UserProfileMenu } from "../components/UserProfileMenu";
import ImmersiveRoutePreview from "../components/ImmersiveRoutePreview";

// Configuration constants
const MAX_DESTINATION_DISTANCE_MILES = 10;
const MAX_DESTINATION_DISTANCE_METERS =
  MAX_DESTINATION_DISTANCE_MILES * 1609.34;

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const [location, setLocation] = useState(null);
  const [fromLocation, setFromLocation] = useState("");
  const [fromLocationCoords, setFromLocationCoords] = useState(null);
  const [destination, setDestination] = useState("");
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [activeField, setActiveField] = useState(null); // 'from' or 'to'
  const [isAICompanionActive, setIsAICompanionActive] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [safeSpots, setSafeSpots] = useState([]);
  const [mapTheme, setMapTheme] = useState(GoogleMapsService.getMapTheme()); // Auto-detect based on time
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [isLoadingAutocomplete, setIsLoadingAutocomplete] = useState(false);
  const [isProcessingSuggestion, setIsProcessingSuggestion] = useState(false);
  const [currentCity, setCurrentCity] = useState("");
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [routeFilterMode, setRouteFilterMode] = useState("safe"); // "safe", "all", "fastest"
  const [isPreviewingRoute, setIsPreviewingRoute] = useState(false);
  const [previewMapRegion, setPreviewMapRegion] = useState(null);
  const [showImmersivePreview, setShowImmersivePreview] = useState(false);

  // Initialize location tracking
  useEffect(() => {
    (async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Please grant location permissions to use navigation features.",
            [{ text: "OK" }]
          );
          return;
        }

        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(currentLocation);
        setFromLocation("Current Location");
        setFromLocationCoords(currentLocation.coords);

        // Update map region to current location
        setMapRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (error) {
        console.error("Error getting location:", error);
        Alert.alert(
          "Location Error",
          "Unable to get your current location. Please check your device settings.",
          [{ text: "OK" }]
        );
      }
    })();
  }, []);

  // Google Maps-style suggestion categories
  const [recentSearches, setRecentSearches] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [contextualSuggestions, setContextualSuggestions] = useState([]);
  const [nearbySuggestions, setNearbySuggestions] = useState([]);

  // Ensure unique IDs for nearby safe spots
  const generateUniqueId = (prefix) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [navigationStartTime, setNavigationStartTime] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [locationWatcher, setLocationWatcher] = useState(null);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState(0);

  const [routeProgress, setRouteProgress] = useState(0);
  const blurTimeoutRef = useRef(null);
  const isTouchingRef = useRef(false);
  const mapRef = useRef(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Sample safe spots data - this will be replaced by Google Places API
  const sampleSafeSpots = [
    {
      id: "police_station_1",
      title: "Police Station",
      coordinate: { latitude: 37.78925, longitude: -122.4314 },
      type: "police",
    },
    {
      id: "pharmacy_1",
      title: "24/7 Pharmacy",
      coordinate: { latitude: 37.78625, longitude: -122.4344 },
      type: "pharmacy",
    },
    {
      id: "hospital_1",
      title: "Hospital",
      coordinate: { latitude: 37.79025, longitude: -122.4304 },
      type: "hospital",
    },
  ];

  useEffect(() => {
    (async () => {
      // Test Google Maps API configuration in development
      if (__DEV__) {
        GoogleMapsTestUtils.testApiKeyConfiguration();
      }

      console.log("🔧 Requesting location permissions...");
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("❌ Foreground location permission denied");
        Alert.alert(
          "Permission denied",
          "Location permission is required for safety features."
        );
        return;
      }
      console.log("✅ Foreground location permission granted");

      // Request background location permission for navigation
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== "granted") {
        console.log("⚠️ Background location permission denied");
      } else {
        console.log("✅ Background location permission granted");
      }

      try {
        console.log("📍 Getting current location...");
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          maximumAge: 15000, // Allow cached location up to 15 seconds old
          timeout: 10000, // 10 second timeout
        });

        console.log("✅ Location obtained:", {
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
        });

        setLocation(currentLocation);
        setLiveLocation(currentLocation);
        setFromLocation("Current Location");
        setFromLocationCoords(currentLocation.coords);
        const newRegion = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        setMapRegion(newRegion);

        // Get current city for suggestions
        await getCurrentCity(currentLocation.coords);

        // Load nearby safe spots
        await loadNearbySafeSpots(currentLocation.coords);
      } catch (locationError) {
        console.error("❌ Error getting location:", locationError);
        Alert.alert(
          "Location Error",
          "Unable to get your current location. Please ensure location services are enabled in your device settings and try again."
        );
      }
    })();
  }, []);

  // Get current city name and generate contextual suggestions
  const getCurrentCity = async (coords) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GoogleMapsService.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        // Find the city name from address components
        const addressComponents = data.results[0].address_components;
        const cityComponent = addressComponents.find(
          (component) =>
            component.types.includes("locality") ||
            component.types.includes("administrative_area_level_2")
        );

        if (cityComponent) {
          const city = cityComponent.long_name;
          setCurrentCity(city);
          generateGoogleMapsStyleSuggestions(city, coords);
          console.log(`📍 Current city: ${city}`);
        }
      }
    } catch (error) {
      console.error("Error getting current city:", error);
      // Fallback suggestions if we can't get the city
      generateGoogleMapsStyleSuggestions("Your Area", coords);
    }
  };

  // Generate Google Maps-style categorized suggestions
  const generateGoogleMapsStyleSuggestions = (city, coords) => {
    // Generate time-based contextual suggestions
    const hour = new Date().getHours();
    let timeBasedSuggestions = [];

    if (hour >= 6 && hour < 11) {
      // Morning suggestions
      timeBasedSuggestions = [
        {
          title: "Coffee shops",
          type: "category",
          icon: "cafe",
          query: "coffee near me",
        },
        {
          title: "Breakfast places",
          type: "category",
          icon: "restaurant",
          query: "breakfast near me",
        },
        {
          title: "Gas stations",
          type: "category",
          icon: "car",
          query: "gas station near me",
        },
      ];
    } else if (hour >= 11 && hour < 14) {
      // Lunch suggestions
      timeBasedSuggestions = [
        {
          title: "Restaurants",
          type: "category",
          icon: "restaurant",
          query: "restaurant near me",
        },
        {
          title: "Fast food",
          type: "category",
          icon: "fast-food",
          query: "fast food near me",
        },
        {
          title: "Pharmacies",
          type: "category",
          icon: "medical",
          query: "pharmacy near me",
        },
      ];
    } else if (hour >= 17 && hour < 22) {
      // Evening suggestions
      timeBasedSuggestions = [];
    } else {
      // Night/late suggestions - safety focused
      timeBasedSuggestions = [
        {
          title: "24/7 stores",
          type: "category",
          icon: "storefront",
          query: "24 hour store near me",
        },
        {
          title: "Police stations",
          type: "category",
          icon: "shield",
          query: "police station near me",
        },
        {
          title: "Hospitals",
          type: "category",
          icon: "medical",
          query: "hospital near me",
        },
      ];
    }

    setContextualSuggestions(timeBasedSuggestions);

    // Generate nearby safety-focused suggestions
    const safetySuggestions = [
      {
        title: "Police stations",
        type: "safety",
        icon: "shield-checkmark",
        query: "police station near me",
      },
      {
        title: "Hospitals",
        type: "safety",
        icon: "medical",
        query: "hospital near me",
      },
      {
        title: "24/7 Pharmacies",
        type: "safety",
        icon: "medical",
        query: "24 hour pharmacy near me",
      },
      {
        title: "Well-lit parking",
        type: "safety",
        icon: "car",
        query: "parking garage near me",
      },
    ];

    setNearbySuggestions(safetySuggestions);
  };

  // Add to recent searches when user searches for something
  const addToRecentSearches = (searchTerm, coords = null) => {
    const newSearch = {
      id: Date.now().toString(),
      title: searchTerm,
      timestamp: new Date(),
      coords: coords,
      icon: "time",
    };

    setRecentSearches((prev) => {
      // Remove if already exists and add to front
      const filtered = prev.filter((item) => item.title !== searchTerm);
      const updated = [newSearch, ...filtered];
      // Keep only last 10 searches
      return updated.slice(0, 10);
    });
  };

  // Handle autocomplete search with debouncing
  const handleAutocompleteSearch = async (input) => {
    if (!input || input.length < 2) {
      setAutocompleteSuggestions([]);
      return;
    }

    setIsLoadingAutocomplete(true);
    try {
      const results = await GoogleMapsService.getPlaceAutocomplete(
        input,
        location?.coords
      );
      setAutocompleteSuggestions(results);
    } catch (error) {
      console.error("❌ Autocomplete error:", error);
      setAutocompleteSuggestions([]);
    } finally {
      setIsLoadingAutocomplete(false);
    }
  };

  // Debounced autocomplete search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const activeInput = activeField === "from" ? fromLocation : destination;
      if (
        activeInput &&
        activeInput.length >= 2 &&
        activeInput !== "Current Location"
      ) {
        handleAutocompleteSearch(activeInput);
      } else {
        setAutocompleteSuggestions([]);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [fromLocation, destination, location, activeField]);

  // Show suggestions when autocomplete results are available
  useEffect(() => {
    const activeInput = activeField === "from" ? fromLocation : destination;
    if (
      activeInput &&
      activeInput.length >= 2 &&
      (autocompleteSuggestions.length > 0 || isLoadingAutocomplete)
    ) {
      setShowSuggestions(true);
    }
  }, [autocompleteSuggestions, destination, isLoadingAutocomplete]);

  // Auto-update map theme based on time of day
  useEffect(() => {
    const updateTheme = () => {
      const newTheme = GoogleMapsService.getMapTheme();
      setMapTheme(newTheme);
    };

    // Update theme immediately
    updateTheme();

    // Set up interval to check time every minute
    const themeInterval = setInterval(updateTheme, 60000); // Check every minute

    return () => clearInterval(themeInterval);
  }, []);

  // Cleanup blur timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      // Clean up location watcher on unmount
      if (locationWatcher) {
        locationWatcher.remove();
      }
    };
  }, [locationWatcher]);

  // Handle app state changes for navigation
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "background" && isNavigating) {
        console.log(
          "📱 App went to background during navigation - continuing location tracking"
        );
      } else if (nextAppState === "active" && isNavigating) {
        console.log("📱 App returned to foreground during navigation");
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [isNavigating]);

  // Live navigation tracking
  useEffect(() => {
    if (isNavigating && selectedRoute) {
      startLiveNavigation();
    } else if (!isNavigating && locationWatcher) {
      stopLiveNavigation();
    }

    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
    };
  }, [isNavigating, selectedRoute]);

  const startLiveNavigation = async () => {
    try {
      console.log("🚀 Starting live navigation tracking...");

      // Stop any existing watcher
      if (locationWatcher) {
        locationWatcher.remove();
      }

      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every second
          distanceInterval: 5, // Update every 5 meters
        },
        (location) => {
          setLiveLocation(location);
          setCurrentHeading(location.coords.heading || 0);

          // Update navigation progress
          updateNavigationProgress(location);

          // Only occasionally auto-center map to allow user exploration
          // This gives users freedom to look around while still providing location updates
          const shouldAutoCenter = Math.random() < 0.2; // 20% chance every update

          if (shouldAutoCenter && mapRef.current) {
            const newRegion = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.005, // Closer zoom for navigation
              longitudeDelta: 0.005,
            };

            // Smoothly animate to new position
            mapRef.current.animateToRegion(newRegion, 1000);
          }
        }
      );

      setLocationWatcher(watcher);
      console.log("✅ Live navigation tracking started");
    } catch (error) {
      console.error("❌ Error starting live navigation:", error);
      Alert.alert(
        "Navigation Error",
        "Unable to start live tracking. Please check location permissions."
      );
    }
  };

  const stopLiveNavigation = () => {
    console.log("🛑 Stopping live navigation tracking...");

    if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }

    // Reset navigation states
    setCurrentStepIndex(0);
    setDistanceToNextStep(0);
    setRouteProgress(0);

    console.log("✅ Live navigation tracking stopped");
  };

  const updateNavigationProgress = (currentLocation) => {
    if (
      !selectedRoute ||
      !selectedRoute.legs ||
      selectedRoute.legs.length === 0
    ) {
      return;
    }

    if (!currentLocation || !currentLocation.coords) {
      console.log("⚠️ Invalid location in updateNavigationProgress");
      return;
    }

    const steps = selectedRoute.legs[0].steps;
    if (currentStepIndex >= steps.length) {
      // Navigation completed
      handleNavigationCompleted();
      return;
    }

    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;

    // Calculate distance to next step
    const distance = calculateDistance(
      currentLocation.coords.latitude,
      currentLocation.coords.longitude,
      currentStep.end_location.lat,
      currentStep.end_location.lng
    );

    setDistanceToNextStep(distance);

    // Check if we're close enough to advance to next step (within 20 meters)
    if (distance < 20 && currentStepIndex < steps.length - 1) {
      console.log(`📍 Advancing to step ${currentStepIndex + 1}`);
      setCurrentStepIndex(currentStepIndex + 1);

      // Move to next step
      console.log(`📍 Moving to next navigation step`);
    }

    // Calculate overall route progress
    const totalSteps = steps.length;
    const progress = ((currentStepIndex + 1) / totalSteps) * 100;
    setRouteProgress(progress);

    // Navigation progress updated
  };

  const speakInstruction = (htmlInstruction) => {
    // Voice commands removed
    return;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Validate if destination is within 10 miles (16.09 km) from current location
  // Validate if the distance between FROM and TO is within 10 miles
  const validateRouteDistance = (fromCoords, toCoords) => {
    const distance = calculateDistance(
      fromCoords.latitude,
      fromCoords.longitude,
      toCoords.latitude,
      toCoords.longitude
    );

    const distanceInMiles = (distance / 1609.34).toFixed(1); // Convert to miles for display
    const isWithinLimit = distance <= MAX_DESTINATION_DISTANCE_METERS;

    return {
      isWithinLimit,
      distance,
      distanceInMiles,
    };
  };

  // Calculate bearing between two points
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const λ1 = (lon1 * Math.PI) / 180;
    const λ2 = (lon2 * Math.PI) / 180;

    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360; // Convert to degrees and normalize
  };

  const handleNavigationCompleted = () => {
    console.log("🎯 Navigation completed!");

    // Navigation completed - voice commands removed

    Alert.alert(
      "Navigation Completed",
      "🎯 You have arrived at your destination!\n\nThank you for using Midnight Mile for your safe journey.",
      [
        {
          text: "Finish",
          onPress: () => {
            setIsNavigating(false);
            setCurrentStepIndex(0);
            setNavigationStartTime(null);
            setEstimatedArrival(null);
          },
        },
      ]
    );
  };

  const getManeuverIcon = (maneuver) => {
    const maneuverIcons = {
      "turn-left": "arrow-back",
      "turn-right": "arrow-forward",
      "turn-slight-left": "arrow-back-outline",
      "turn-slight-right": "arrow-forward-outline",
      "turn-sharp-left": "return-up-back",
      "turn-sharp-right": "return-up-forward",
      "uturn-left": "return-down-back",
      "uturn-right": "return-down-forward",
      straight: "arrow-up",
      "ramp-left": "trending-up",
      "ramp-right": "trending-up",
      merge: "git-merge",
      "fork-left": "git-branch",
      "fork-right": "git-branch",
      ferry: "boat",
      "roundabout-left": "refresh-circle",
      "roundabout-right": "refresh-circle",
    };

    return maneuverIcons[maneuver] || "navigate";
  };

  const loadNearbySafeSpots = async (coords) => {
    try {
      console.log("📍 Loading nearby safe spots using Google Places API...");

      // Get nearby safe spots using Places API
      const [police, hospitals, pharmacies] = await Promise.all([
        GoogleMapsService.getNearbyPlaces(coords, "police"),
        GoogleMapsService.getNearbyPlaces(coords, "hospital"),
        GoogleMapsService.getNearbyPlaces(coords, "pharmacy"),
      ]);

      const allSafeSpots = [
        ...police.map((spot) => ({
          ...spot,
          id: spot.id || generateUniqueId("police"),
          type: "police",
        })),
        ...hospitals.map((spot) => ({
          ...spot,
          id: spot.id || generateUniqueId("hospital"),
          type: "hospital",
        })),
        ...pharmacies.map((spot) => ({
          ...spot,
          id: spot.id || generateUniqueId("pharmacy"),
          type: "pharmacy",
        })),
      ];

      // Remove duplicates based on place ID
      const uniqueSafeSpots = allSafeSpots.filter(
        (spot, index, self) => index === self.findIndex((s) => s.id === spot.id)
      );

      console.log(
        `✅ Loaded ${uniqueSafeSpots.length} unique safe spots from Places API (${allSafeSpots.length} total before deduplication)`
      );
      setSafeSpots(uniqueSafeSpots);
    } catch (error) {
      console.error("❌ Error loading safe spots from Places API:", error);
      console.log("📍 Falling back to sample safe spots data");
      // Fallback to sample data if API fails
      setSafeSpots(sampleSafeSpots);
    }
  };

  const handleDestinationSearch = async () => {
    if (!destination.trim()) {
      Alert.alert(
        "Enter Destination",
        "Please enter a destination to get safe routes."
      );
      return;
    }

    // Determine the starting location
    let startLocation;
    let startCoords;

    if (fromLocationCoords && fromLocation !== "Current Location") {
      // Use the FROM location if it's set and not current location
      startLocation = fromLocation;
      startCoords = fromLocationCoords;
    } else if (location && location.coords) {
      // Use current location as fallback
      startLocation = "Current Location";
      startCoords = location.coords;
    } else {
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please ensure location services are enabled and try again."
      );
      return;
    }

    setIsLoadingRoutes(true);

    try {
      // Geocode the destination
      const destinationLocation = await GoogleMapsService.geocodeAddress(
        destination
      );

      // Validate distance - check if route distance is within 10 miles
      const distanceValidation = validateRouteDistance(
        startCoords,
        destinationLocation
      );

      if (!distanceValidation.isWithinLimit) {
        Alert.alert(
          "Route Too Long",
          `The route distance is ${distanceValidation.distanceInMiles} miles. For your safety, Midnight Mile only supports routes within ${MAX_DESTINATION_DISTANCE_MILES} miles between start and destination.\n\nPlease choose closer locations.`,
          [
            {
              text: "Choose Another",
              style: "default",
            },
            {
              text: "Clear",
              style: "cancel",
              onPress: () => {
                setDestination("");
                setDestinationCoords(null);
              },
            },
          ]
        );
        setIsLoadingRoutes(false);
        return;
      }

      console.log(
        `✅ Route distance is ${distanceValidation.distanceInMiles} miles - within ${MAX_DESTINATION_DISTANCE_MILES} mile limit`
      );
      setDestinationCoords(destinationLocation);

      let fetchedRoutes = [];

      // Get all possible routes first, then filter/sort based on selected mode
      const allRoutes = await GoogleMapsService.getAllPossibleRoutes(
        startCoords,
        destinationLocation
      );

      // Apply filtering and sorting based on the selected filter mode
      console.log(
        `🔄 Applying filter mode: ${routeFilterMode} to ${allRoutes.length} routes`
      );

      if (routeFilterMode === "safe") {
        // Safest routes: Sort by safety score (highest first), then by duration
        fetchedRoutes = allRoutes.sort((a, b) => {
          if (a.safetyScore !== b.safetyScore) {
            return b.safetyScore - a.safetyScore; // Higher safety score first
          }
          return a.legs[0].duration.value - b.legs[0].duration.value; // Then by duration
        });
        console.log(
          `✅ Safe routes sorted by safety score. Top route safety: ${fetchedRoutes[0]?.safetyScore}/100`
        );
      } else if (routeFilterMode === "fastest") {
        // Fastest routes: Sort by duration only, regardless of safety
        fetchedRoutes = allRoutes.sort(
          (a, b) => a.legs[0].duration.value - b.legs[0].duration.value
        );
        console.log(
          `✅ Fastest routes sorted by duration. Top route time: ${fetchedRoutes[0]?.estimatedTime}`
        );
      } else if (routeFilterMode === "all") {
        // All routes: Show all routes with balanced sorting (safety + efficiency)
        fetchedRoutes = allRoutes.sort((a, b) => {
          // Balanced scoring: 60% safety, 40% time efficiency
          const safetyWeight = 0.6;
          const timeWeight = 0.4;

          // Normalize safety score (0-100) and time efficiency (inverse of duration)
          const aSafetyNorm = a.safetyScore / 100;
          const bSafetyNorm = b.safetyScore / 100;

          // For time efficiency, shorter duration = higher score
          const maxDuration = Math.max(
            a.legs[0].duration.value,
            b.legs[0].duration.value
          );
          const aTimeNorm =
            (maxDuration - a.legs[0].duration.value) / maxDuration;
          const bTimeNorm =
            (maxDuration - b.legs[0].duration.value) / maxDuration;

          // Calculate composite scores
          const aComposite =
            aSafetyNorm * safetyWeight + aTimeNorm * timeWeight;
          const bComposite =
            bSafetyNorm * safetyWeight + bTimeNorm * timeWeight;

          return bComposite - aComposite; // Higher composite score first
        });
        console.log(
          `✅ All routes sorted by balanced score. Top route: safety ${fetchedRoutes[0]?.safetyScore}/100, time ${fetchedRoutes[0]?.estimatedTime}`
        );
      }

      setRoutes(fetchedRoutes);
      if (fetchedRoutes.length > 0) {
        setSelectedRoute(fetchedRoutes[0]); // Select the best route by default
      }

      // Update map region to show both origin and destination
      const midpointLat =
        (startCoords.latitude + destinationLocation.latitude) / 2;
      const midpointLng =
        (startCoords.longitude + destinationLocation.longitude) / 2;
      const latDelta =
        Math.abs(startCoords.latitude - destinationLocation.latitude) * 1.5;
      const lngDelta =
        Math.abs(startCoords.longitude - destinationLocation.longitude) * 1.5;

      setMapRegion({
        latitude: midpointLat,
        longitude: midpointLng,
        latitudeDelta: Math.max(latDelta, 0.01),
        longitudeDelta: Math.max(lngDelta, 0.01),
      });
    } catch (error) {
      console.error("❌ Error getting routes:", error);

      let errorTitle = "Navigation Error";
      let errorMessage = "Unable to calculate route. Please try again.";

      if (
        error.message.includes("Location") &&
        error.message.includes("not found")
      ) {
        errorTitle = "Destination Not Found";
        errorMessage = `"${destination}" could not be found. Please try:\n\n• A more specific address\n• Adding city name (e.g., "Patrika Gate, Jaipur")\n• Using a landmark with full address`;
      } else if (error.message.includes("ZERO_RESULTS")) {
        errorTitle = "No Route Available";
        errorMessage =
          "No walking route found to this destination. Try a different location or transportation mode.";
      } else if (error.message.includes("API")) {
        errorTitle = "Service Unavailable";
        errorMessage =
          "Navigation service is temporarily unavailable. Please try again later.";
      }

      Alert.alert(errorTitle, errorMessage, [
        { text: "Try Again", style: "default" },
        { text: "Cancel", style: "cancel" },
      ]);
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const toggleAICompanion = () => {
    setIsAICompanionActive(!isAICompanionActive);
    Alert.alert(
      isAICompanionActive
        ? "AI Companion Deactivated"
        : "AI Companion Activated",
      isAICompanionActive
        ? "Your AI companion is now offline."
        : "Your AI companion is now listening and ready to help."
    );
  };

  const handleSOS = () => {
    Alert.alert(
      "SOS Activated",
      "Emergency alert sent to your trusted contacts. Help is on the way.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", style: "destructive" },
      ]
    );
  };

  const getMarkerIcon = (type) => {
    switch (type) {
      case "police":
        return "shield";
      case "pharmacy":
        return "medkit-outline";
      case "hospital":
        return "business-outline";
      default:
        return "location";
    }
  };

  const getSpotColor = (type) => {
    switch (type) {
      case "police":
        return COLORS.deepNavy;
      case "hospital":
        return COLORS.safeGreen;
      case "pharmacy":
        return COLORS.safeGreen;
      default:
        return COLORS.mutedTeal;
    }
  };

  const selectRoute = (route) => {
    setSelectedRoute(route);

    // Focus map on the selected route
    if (route && route.overview_polyline && location && destinationCoords) {
      console.log("🗺️ Focusing map on selected route...");

      // Decode the route polyline to get all coordinates
      const routeCoordinates = GoogleMapsService.decodePolyline(
        route.overview_polyline.points
      );

      // Find the bounds of the route including start and end points
      let minLat = Math.min(
        location.coords.latitude,
        destinationCoords.latitude
      );
      let maxLat = Math.max(
        location.coords.latitude,
        destinationCoords.latitude
      );
      let minLng = Math.min(
        location.coords.longitude,
        destinationCoords.longitude
      );
      let maxLng = Math.max(
        location.coords.longitude,
        destinationCoords.longitude
      );

      // Include all route coordinates in bounds calculation
      routeCoordinates.forEach((coord) => {
        minLat = Math.min(minLat, coord.latitude);
        maxLat = Math.max(maxLat, coord.latitude);
        minLng = Math.min(minLng, coord.longitude);
        maxLng = Math.max(maxLng, coord.longitude);
      });

      // Add padding to the bounds (20% padding for better visibility)
      const latPadding = (maxLat - minLat) * 0.2;
      const lngPadding = (maxLng - minLng) * 0.2;

      const routeRegion = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(maxLat - minLat + latPadding, 0.01),
        longitudeDelta: Math.max(maxLng - minLng + lngPadding, 0.01),
      };

      setMapRegion(routeRegion);

      // Animate to the route region
      if (mapRef.current) {
        mapRef.current.animateToRegion(routeRegion, 1000);
      }

      console.log("✅ Map focused on selected route");
    }
  };

  // Zoom controls for route viewing
  const handleZoomIn = () => {
    if (mapRef.current) {
      const currentRegion = isPreviewingRoute ? previewMapRegion : mapRegion;
      const newRegion = {
        ...currentRegion,
        latitudeDelta: currentRegion.latitudeDelta * 0.7,
        longitudeDelta: currentRegion.longitudeDelta * 0.7,
      };

      if (isPreviewingRoute) {
        setPreviewMapRegion(newRegion);
      } else {
        setMapRegion(newRegion);
      }

      mapRef.current.animateToRegion(newRegion, 300);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const currentRegion = isPreviewingRoute ? previewMapRegion : mapRegion;
      const newRegion = {
        ...currentRegion,
        latitudeDelta: currentRegion.latitudeDelta * 1.4,
        longitudeDelta: currentRegion.longitudeDelta * 1.4,
      };

      if (isPreviewingRoute) {
        setPreviewMapRegion(newRegion);
      } else {
        setMapRegion(newRegion);
      }

      mapRef.current.animateToRegion(newRegion, 300);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    console.log(`🎯 Selected suggestion:`, suggestion);
    console.log(`📍 Current location available:`, !!location);
    console.log(`📍 Active field:`, activeField);

    setIsProcessingSuggestion(true);
    setShowSuggestions(false);
    setAutocompleteSuggestions([]);

    // Handle different types of suggestions
    if (suggestion.type === "category" || suggestion.type === "safety") {
      // For category suggestions, use the query to search
      const searchTerm = suggestion.query || suggestion.title;

      if (activeField === "from") {
        setFromLocation(searchTerm);
        // For FROM field, we would typically search for nearby locations
        // For now, just treat it as a regular search term
      } else {
        setDestination(searchTerm);
      }

      addToRecentSearches(suggestion.title);

      setTimeout(() => {
        console.log(`🚀 Starting category search for: ${searchTerm}`);
        if (activeField === "to") {
          handleDestinationSearch();
        }
        setIsProcessingSuggestion(false);
      }, 100);
    } else if (suggestion.type === "saved") {
      // Handle saved places (Home, Work)
      if (suggestion.coords) {
        if (activeField === "from") {
          setFromLocation(suggestion.title);
          setFromLocationCoords(suggestion.coords);
        } else {
          setDestination(suggestion.title);
          setDestinationCoords(suggestion.coords);
        }
        addToRecentSearches(suggestion.title, suggestion.coords);
        // You would handle saved place navigation here
      } else {
        Alert.alert(
          `Set ${suggestion.title}`,
          `Would you like to set your ${suggestion.title.toLowerCase()} location?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Set Location",
              onPress: () => {
                // Handle setting saved location
                console.log(`Setting ${suggestion.title} location`);
              },
            },
          ]
        );
      }
      setIsProcessingSuggestion(false);
    } else {
      // Handle recent searches or regular text
      const searchTerm = suggestion.title || suggestion;

      if (activeField === "from") {
        setFromLocation(searchTerm);
        // Clear existing routes when FROM location changes
        if (routes.length > 0) {
          setRoutes([]);
          setSelectedRoute(null);
          console.log("🧹 Cleared routes due to FROM location change");
        }
      } else {
        setDestination(searchTerm);
      }

      addToRecentSearches(searchTerm);

      setTimeout(() => {
        console.log(`🚀 Starting destination search for: ${searchTerm}`);
        if (activeField === "to") {
          handleDestinationSearch();
        }
        setIsProcessingSuggestion(false);
      }, 100);
    }
  };

  const handleAutocompleteSuggestionSelect = async (suggestion) => {
    console.log(`🎯 Suggestion selected - starting process...`);
    console.log(`📍 Suggestion details:`, suggestion);
    console.log(`📍 Current location state:`, location ? "Available" : "NULL");
    console.log(`📍 Location coords:`, location?.coords ? "Available" : "NULL");
    console.log(`📍 Active field:`, activeField);

    // Update the input field immediately with the full address
    const fullAddress =
      (suggestion.main_text || "") +
      (suggestion.secondary_text ? `, ${suggestion.secondary_text}` : "");

    if (activeField === "from") {
      setFromLocation(fullAddress);
    } else {
      setDestination(fullAddress);
    }
    setShowSuggestions(false);

    setIsProcessingSuggestion(true);

    try {
      // Check if location is available - with more detailed logging
      if (!location || !location.coords) {
        console.log(
          `❌ Location check failed - location:`,
          !!location,
          "coords:",
          !!location?.coords
        );

        // Try to get location again if not available
        try {
          console.log(`🔄 Attempting to get current location...`);
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            maximumAge: 10000, // Allow cached location up to 10 seconds old
          });

          if (currentLocation && currentLocation.coords) {
            console.log(`✅ Successfully got current location`);
            setLocation(currentLocation);
            setLiveLocation(currentLocation);
            // Update FROM field if it's still "Current Location"
            if (fromLocation === "Current Location") {
              setFromLocationCoords(currentLocation.coords);
            }

            // Continue with the selection process using the fresh location
            await processAutocompleteSuggestion(suggestion, currentLocation);
            return;
          }
        } catch (locationError) {
          console.error(`❌ Failed to get current location:`, locationError);
        }

        Alert.alert(
          "Location Error",
          "Unable to get your current location. Please ensure location services are enabled and try again."
        );
        setIsProcessingSuggestion(false);
        return;
      }

      // Process the suggestion with existing location
      await processAutocompleteSuggestion(suggestion, location);
    } catch (error) {
      console.error("❌ Error with autocomplete selection:", error);
      Alert.alert(
        "Error",
        "Unable to get details for selected place. Please try again."
      );
    } finally {
      setIsProcessingSuggestion(false);
      console.log(`✅ Autocomplete selection process completed`);
    }
  };

  // Helper function to process the autocomplete suggestion
  const processAutocompleteSuggestion = async (suggestion, currentLocation) => {
    // Immediately update the input with the full suggestion text and hide suggestions for better UX
    const fullAddress =
      (suggestion.main_text || "") +
      (suggestion.secondary_text ? `, ${suggestion.secondary_text}` : "");

    if (activeField === "from") {
      setFromLocation(fullAddress);
    } else {
      setDestination(fullAddress);
    }
    setShowSuggestions(false);
    setAutocompleteSuggestions([]);

    console.log(`🎯 Selected suggestion: ${suggestion.main_text}`);
    console.log(
      `🔍 Getting place details for place_id: ${suggestion.place_id}`
    );

    // Get place details to get coordinates
    const placeDetails = await GoogleMapsService.getPlaceDetails(
      suggestion.place_id
    );
    console.log(`📍 Place details received:`, placeDetails);

    if (activeField === "from") {
      // Handle FROM field selection
      setFromLocationCoords(placeDetails);
      addToRecentSearches(suggestion.main_text, placeDetails);

      // If TO is already set, validate the new route distance
      if (destinationCoords) {
        const distanceValidation = validateRouteDistance(
          placeDetails,
          destinationCoords
        );

        if (!distanceValidation.isWithinLimit) {
          Alert.alert(
            "Route Too Long",
            `The route distance would be ${distanceValidation.distanceInMiles} miles. For your safety, Midnight Mile only supports routes within ${MAX_DESTINATION_DISTANCE_MILES} miles between start and destination.\n\nPlease choose a closer starting location.`,
            [{ text: "OK" }]
          );
          return;
        }
      }

      // Clear existing routes when FROM location changes
      if (routes.length > 0) {
        setRoutes([]);
        setSelectedRoute(null);
        console.log("🧹 Cleared routes due to FROM location change");
      }
      console.log(`✅ FROM location set successfully`);
      return;
    }

    // Handle TO field selection (existing logic)
    setIsLoadingRoutes(true);

    // Determine the FROM coordinates for distance validation
    const fromCoords = fromLocationCoords || currentLocation.coords;

    // Validate distance - check if route distance is within 10 miles
    const distanceValidation = validateRouteDistance(fromCoords, placeDetails);

    if (!distanceValidation.isWithinLimit) {
      Alert.alert(
        "Route Too Long",
        `The route distance is ${distanceValidation.distanceInMiles} miles. For your safety, Midnight Mile only supports routes within ${MAX_DESTINATION_DISTANCE_MILES} miles between start and destination.\n\nPlease choose closer locations.`,
        [
          {
            text: "Choose Another",
            style: "default",
          },
          {
            text: "Clear",
            style: "cancel",
            onPress: () => {
              setDestination("");
              setDestinationCoords(null);
            },
          },
        ]
      );
      setIsLoadingRoutes(false);
      return;
    }

    console.log(
      `✅ Route distance is ${distanceValidation.distanceInMiles} miles - within ${MAX_DESTINATION_DISTANCE_MILES} mile limit`
    );
    setDestinationCoords(placeDetails);

    // Add to recent searches
    addToRecentSearches(suggestion.main_text, placeDetails);

    console.log(`🚶 Getting safe routes from start location to destination...`);
    // Get safe routes using the FROM coordinates and destination place details
    const safeRoutes = await GoogleMapsService.getSafeRoutes(
      fromCoords,
      placeDetails
    );

    console.log(`🗺️ Routes received:`, safeRoutes.length, "routes");
    setRoutes(safeRoutes);
    if (safeRoutes.length > 0) {
      setSelectedRoute(safeRoutes[0]);
      console.log(`✅ Route selected successfully`);
    }

    // Update map region - with null checks
    if (fromCoords && placeDetails) {
      const midpointLat = (fromCoords.latitude + placeDetails.latitude) / 2;
      const midpointLng = (fromCoords.longitude + placeDetails.longitude) / 2;
      const latDelta =
        Math.abs(fromCoords.latitude - placeDetails.latitude) * 1.5;
      const lngDelta =
        Math.abs(fromCoords.longitude - placeDetails.longitude) * 1.5;

      setMapRegion({
        latitude: midpointLat,
        longitude: midpointLng,
        latitudeDelta: Math.max(latDelta, 0.01),
        longitudeDelta: Math.max(lngDelta, 0.01),
      });

      console.log(`🗺️ Map region updated successfully`);
    } else {
      console.log(
        `⚠️ Skipping map region update - missing location or place details`
      );
    }

    setIsLoadingRoutes(false);
  };

  const handleInputFocus = () => {
    const activeInput = activeField === "from" ? fromLocation : destination;

    // Show "No recent searches" message when input is empty
    if (
      !activeInput ||
      activeInput.length === 0 ||
      activeInput === "Current Location"
    ) {
      setShowSuggestions(true);
      setAutocompleteSuggestions([
        {
          main_text: "No recent searches",
          secondary_text: "",
          type: "message",
          title: "No recent searches", // Adding title for rendering
        },
      ]);
    }
    // Show autocomplete suggestions when typing
    else if (activeInput.length >= 2) {
      setShowSuggestions(true);
      // Trigger autocomplete immediately if not already done
      if (autocompleteSuggestions.length === 0) {
        handleAutocompleteSearch(activeInput);
      }
    } else {
      // Show Google Maps-style suggestions when input is empty/short
      const hasAnySuggestions =
        recentSearches.length > 0 ||
        savedPlaces.length > 0 ||
        contextualSuggestions.length > 0 ||
        nearbySuggestions.length > 0;

      if (hasAnySuggestions) {
        setShowSuggestions(true);
      }
    }
  };

  const handleInputBlur = () => {
    const activeInput = activeField === "from" ? fromLocation : destination;

    // Don't hide suggestions at all when user is actively searching and we have autocomplete results
    if (
      activeInput &&
      activeInput.length >= 2 &&
      autocompleteSuggestions.length > 0
    ) {
      console.log(
        `🔍 Input blur - but keeping suggestions visible because user is searching`
      );
      return;
    }

    console.log(`🔍 Input blur - scheduling hide in 1000ms (long delay)`);

    // Clear any existing blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    // Set new timeout with much longer delay
    blurTimeoutRef.current = setTimeout(() => {
      console.log(
        `🔍 Long blur timeout fired. TouchingRef: ${isTouchingRef.current}, Processing: ${isProcessingSuggestion}`
      );
      // Only hide if we're not touching suggestions and not processing
      if (!isTouchingRef.current && !isProcessingSuggestion) {
        console.log(`🔍 Hiding suggestions after long blur timeout`);
        setShowSuggestions(false);
      } else {
        console.log(
          `🔍 Keeping suggestions visible - user is still interacting`
        );
      }
      blurTimeoutRef.current = null;
    }, 1000); // Much longer delay
  };

  const handleOutsidePress = () => {
    // Close suggestions when user taps outside
    if (showSuggestions) {
      setShowSuggestions(false);
    }
  };

  const handleClearField = (field = null) => {
    const fieldToClear = field || activeField;

    if (fieldToClear === "from") {
      // Clear FROM field and reset to Current Location
      setFromLocation("Current Location");
      setFromLocationCoords(location?.coords || null);
    } else {
      // Clear TO field
      setDestination("");
      setDestinationCoords(null);
      setRoutes([]);
      setSelectedRoute(null);
    }

    setAutocompleteSuggestions([]);
    setShowSuggestions(false);
    console.log(`🧹 ${fieldToClear.toUpperCase()} field cleared`);
  };

  const handleClearDestination = () => {
    // Backward compatibility - clear destination field
    handleClearField("to");
  };

  // Helper function to parse duration text to minutes
  const parseDurationToMinutes = (durationText) => {
    if (!durationText) return 0;

    // Handle various duration formats: "15 mins", "1 hour 30 mins", "2 hours", etc.
    const text = durationText.toLowerCase();
    let totalMinutes = 0;

    // Extract hours
    const hourMatch = text.match(/(\d+)\s*hour/);
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1]) * 60;
    }

    // Extract minutes
    const minMatch = text.match(/(\d+)\s*min/);
    if (minMatch) {
      totalMinutes += parseInt(minMatch[1]);
    }

    // If no hours or minutes found, try to extract just a number (assume minutes)
    if (totalMinutes === 0) {
      const numberMatch = text.match(/(\d+)/);
      if (numberMatch) {
        totalMinutes = parseInt(numberMatch[1]);
      }
    }

    return totalMinutes || 15; // Default to 15 minutes if parsing fails
  };

  const handleStartNavigation = () => {
    if (!selectedRoute || !location || !location.coords || !destinationCoords) {
      Alert.alert(
        "Navigation Error",
        "Please ensure you have a valid route and location before starting navigation."
      );
      return;
    }

    // Set navigation state
    setIsNavigating(true);
    setCurrentStepIndex(0);
    setNavigationStartTime(new Date());
    setRouteProgress(0);

    // Calculate estimated arrival time with proper null checks
    let arrivalTime = null;
    try {
      // Check if duration exists and has text property
      const durationText =
        selectedRoute.estimatedTime ||
        (selectedRoute.legs &&
          selectedRoute.legs[0] &&
          selectedRoute.legs[0].duration &&
          selectedRoute.legs[0].duration.text);

      if (durationText) {
        // Extract minutes from duration text (e.g., "15 mins" or "1 hour 30 mins")
        const minutes = parseDurationToMinutes(durationText);
        arrivalTime = new Date(Date.now() + minutes * 60000);
        setEstimatedArrival(arrivalTime);
      }
    } catch (error) {
      console.error("Error calculating arrival time:", error);
      // Continue without arrival time if calculation fails
    }

    console.log("🚀 Live navigation started successfully");

    // Enable AI companion for safety if not already active
    if (!isAICompanionActive) {
      setIsAICompanionActive(true);
    }

    // Start navigation directly and set up 3D navigation view
    if (
      selectedRoute.legs &&
      selectedRoute.legs[0] &&
      selectedRoute.legs[0].steps.length > 0
    ) {
      console.log("Starting navigation in 3D mode...");

      // Calculate initial bearing towards the first step
      if (mapRef.current && location) {
        const firstStep = selectedRoute.legs[0].steps[0];
        const bearing = calculateBearing(
          location.coords.latitude,
          location.coords.longitude,
          firstStep.start_location.lat,
          firstStep.start_location.lng
        );

        // Animate to 3D view with camera facing route direction
        mapRef.current.animateCamera(
          {
            center: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            pitch: 45, // Tilt camera for 3D view
            heading: bearing, // Orient camera towards route direction
            zoom: 18, // Closer zoom level for navigation
            altitude: 500, // Optional: control viewing height
          },
          { duration: 1000 }
        ); // Smooth animation over 1 second
      }
    }
  };

  const handleStopNavigation = () => {
    Alert.alert(
      "Stop Navigation",
      "Are you sure you want to stop live navigation?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Stop",
          style: "destructive",
          onPress: () => {
            setIsNavigating(false);
            setCurrentStepIndex(0);
            setNavigationStartTime(null);
            setEstimatedArrival(null);
            setRouteProgress(0);
            setDistanceToNextStep(0);

            // Stop location tracking
            if (locationWatcher) {
              locationWatcher.remove();
              setLocationWatcher(null);
            }

            // Navigation stopped

            console.log("🛑 Live navigation stopped");
          },
        },
      ]
    );
  };

  // Route Preview Functions
  const handlePreviewRoute = () => {
    if (!selectedRoute || !location || !destinationCoords) {
      Alert.alert("Preview Error", "Please select a route to preview.");
      return;
    }

    console.log("🔍 Opening immersive route preview...");
    setShowImmersivePreview(true);
  };

  const handleExitPreview = () => {
    console.log("🔍 Exiting route preview...");
    setIsPreviewingRoute(false);
    setPreviewMapRegion(null);

    // Return to normal view focused on current location
    if (location && mapRef.current) {
      const normalRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(normalRegion, 1000);
    }

    console.log("✅ Route preview exited");
  };

  const getCurrentStep = () => {
    if (
      !selectedRoute ||
      !selectedRoute.legs ||
      selectedRoute.legs.length === 0
    ) {
      return null;
    }

    const steps = selectedRoute.legs[0].steps;
    if (currentStepIndex >= steps.length) {
      return null;
    }

    return steps[currentStepIndex];
  };

  const getNextInstruction = () => {
    const currentStep = getCurrentStep();
    if (!currentStep) {
      if (routeProgress >= 95) {
        return "You are approaching your destination";
      }
      return "Follow the route to your destination";
    }

    // Remove HTML tags from instructions
    const instruction = currentStep.html_instructions.replace(/<[^>]*>/g, "");

    // Add distance information if available
    if (distanceToNextStep > 0) {
      const distanceText =
        distanceToNextStep < 1000
          ? `${Math.round(distanceToNextStep)}m`
          : `${(distanceToNextStep / 1000).toFixed(1)}km`;

      return `In ${distanceText}: ${instruction}`;
    }

    return instruction;
  };

  const getInstructionWithDistance = () => {
    const currentStep = getCurrentStep();
    if (!currentStep) return "Continue to destination";

    const baseInstruction = currentStep.html_instructions.replace(
      /<[^>]*>/g,
      ""
    );

    if (distanceToNextStep <= 50) {
      return `Now: ${baseInstruction}`;
    } else if (distanceToNextStep <= 100) {
      return `In ${Math.round(distanceToNextStep)}m: ${baseInstruction}`;
    } else if (distanceToNextStep < 1000) {
      return `In ${Math.round(distanceToNextStep)}m: ${baseInstruction}`;
    } else {
      return `In ${(distanceToNextStep / 1000).toFixed(
        1
      )}km: ${baseInstruction}`;
    }
  };

  // Memoized values to prevent unnecessary re-renders
  const memoizedStartLocation = useMemo(() => {
    return location
      ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }
      : null;
  }, [location?.coords.latitude, location?.coords.longitude]);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleImmersivePreviewClose = useCallback(() => {
    setShowImmersivePreview(false);
  }, []);

  const handleImmersivePreviewStartNavigation = useCallback(() => {
    setShowImmersivePreview(false);
    handleStartNavigation();
  }, []);

  return (
    <>
      <TouchableWithoutFeedback onPress={handleOutsidePress}>
        <SafeAreaView style={styles.container}>
          {/* User Profile Menu */}
          <UserProfileMenu />

          {/* Search Container with FROM and TO fields */}
          <View style={styles.searchContainer}>
            {/* FROM Field */}
            <View
              style={[
                styles.searchBar,
                activeField === "from" && styles.searchBarActive,
              ]}
            >
              <Ionicons
                name="radio-button-on"
                size={16}
                color={COLORS.mutedTeal}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="From location"
                placeholderTextColor={COLORS.slateGray}
                value={fromLocation}
                onChangeText={(text) => {
                  setFromLocation(text);
                  setActiveField("from");
                  if (text.length >= 2 && text !== "Current Location") {
                    setShowSuggestions(true);
                  } else if (text.length === 0) {
                    // Show Google Maps-style suggestions when empty
                    const hasAnySuggestions =
                      recentSearches.length > 0 ||
                      savedPlaces.length > 0 ||
                      contextualSuggestions.length > 0 ||
                      nearbySuggestions.length > 0;
                    setShowSuggestions(hasAnySuggestions);
                    setAutocompleteSuggestions([]); // Clear autocomplete when text is cleared
                  } else {
                    // For text length 1, hide suggestions but don't clear autocomplete yet
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => {
                  setActiveField("from");
                  handleInputFocus();
                }}
                onBlur={handleInputBlur}
              />
              <TouchableOpacity
                onPress={() => {
                  if (
                    fromLocation.trim() &&
                    fromLocation !== "Current Location"
                  ) {
                    setFromLocation("");
                    setFromLocationCoords(null);
                  }
                }}
              >
                <Ionicons
                  name={
                    fromLocation.trim() && fromLocation !== "Current Location"
                      ? "close"
                      : "location"
                  }
                  size={16}
                  color={COLORS.slateGray}
                />
              </TouchableOpacity>
            </View>

            {/* Swap Button */}
            <TouchableOpacity
              style={styles.swapButton}
              onPress={() => {
                const tempLocation = fromLocation;
                const tempCoords = fromLocationCoords;
                setFromLocation(destination || "Current Location");
                setFromLocationCoords(
                  destination ? destinationCoords : location?.coords
                );
                setDestination(
                  tempLocation === "Current Location" ? "" : tempLocation
                );
                setDestinationCoords(
                  tempLocation === "Current Location" ? null : tempCoords
                );
              }}
            >
              <Ionicons
                name="swap-vertical"
                size={20}
                color={COLORS.mutedTeal}
              />
            </TouchableOpacity>

            {/* TO Field */}
            <View
              style={[
                styles.searchBar,
                styles.toField,
                activeField === "to" && styles.searchBarActive,
              ]}
            >
              <Ionicons name="location" size={16} color={COLORS.safetyAmber} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Where to? (max ${MAX_DESTINATION_DISTANCE_MILES} miles from start)`}
                placeholderTextColor={COLORS.slateGray}
                value={destination}
                onChangeText={(text) => {
                  setDestination(text);
                  setActiveField("to");
                  if (text.length >= 2) {
                    setShowSuggestions(true);
                  } else if (text.length === 0) {
                    // Show Google Maps-style suggestions when empty
                    const hasAnySuggestions =
                      recentSearches.length > 0 ||
                      savedPlaces.length > 0 ||
                      contextualSuggestions.length > 0 ||
                      nearbySuggestions.length > 0;
                    setShowSuggestions(hasAnySuggestions);
                    setAutocompleteSuggestions([]); // Clear autocomplete when text is cleared
                  } else {
                    // For text length 1, hide suggestions but don't clear autocomplete yet
                    setShowSuggestions(false);
                  }
                }}
                onSubmitEditing={handleDestinationSearch}
                onFocus={() => {
                  setActiveField("to");
                  handleInputFocus();
                }}
                onBlur={handleInputBlur}
              />
              <TouchableOpacity
                onPress={
                  destination.trim()
                    ? handleClearDestination
                    : handleDestinationSearch
                }
              >
                <Ionicons
                  name={destination.trim() ? "close" : "arrow-forward"}
                  size={16}
                  color={
                    destination.trim() ? COLORS.slateGray : COLORS.mutedTeal
                  }
                />
              </TouchableOpacity>
            </View>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <View
                style={styles.suggestionsContainer}
                onStartShouldSetResponder={(evt) => {
                  // Only capture touch events if they're not on the ScrollView
                  return false;
                }}
                onResponderStart={() => {
                  console.log(`🔥 Suggestions container touch started`);
                  isTouchingRef.current = true;
                  if (blurTimeoutRef.current) {
                    clearTimeout(blurTimeoutRef.current);
                    blurTimeoutRef.current = null;
                  }
                }}
                onResponderEnd={() => {
                  console.log(`🔥 Suggestions container touch ended`);
                  isTouchingRef.current = false;
                }}
              >
                <ScrollView
                  style={styles.suggestionsList}
                  contentContainerStyle={styles.suggestionsContent}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  onTouchStart={() => {
                    isTouchingRef.current = true;
                    if (blurTimeoutRef.current) {
                      clearTimeout(blurTimeoutRef.current);
                      blurTimeoutRef.current = null;
                    }
                  }}
                  onTouchEnd={() => {
                    // Don't immediately set to false, let the suggestion selection complete
                    setTimeout(() => {
                      if (!isProcessingSuggestion) {
                        isTouchingRef.current = false;
                      }
                    }, 100);
                  }}
                >
                  {/* Loading state for autocomplete */}
                  {activeField &&
                    (
                      (activeField === "from" ? fromLocation : destination) ||
                      ""
                    ).length >= 2 &&
                    isLoadingAutocomplete &&
                    autocompleteSuggestions.length === 0 && (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator
                          size="small"
                          color={COLORS.mutedTeal}
                        />
                        <Text style={styles.loadingText}>
                          Searching places...
                        </Text>
                      </View>
                    )}

                  {/* Autocomplete Results (show when typing and we have results) */}
                  {activeField &&
                    (
                      (activeField === "from" ? fromLocation : destination) ||
                      ""
                    ).length >= 2 &&
                    autocompleteSuggestions.length > 0 && (
                      <>
                        <View style={styles.suggestionsHeaderContainer}>
                          <Text style={styles.suggestionsHeader}>
                            Search Results
                          </Text>
                          {isLoadingAutocomplete && (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.mutedTeal}
                            />
                          )}
                        </View>
                        {autocompleteSuggestions.map((suggestion, index) => (
                          <TouchableOpacity
                            key={`auto-${index}`}
                            style={styles.suggestionItem}
                            activeOpacity={0.7}
                            onPressIn={() => {
                              console.log(
                                `🔥 Press IN for: ${suggestion.main_text}`
                              );
                              isTouchingRef.current = true;
                              setIsProcessingSuggestion(true);
                              // Clear any pending blur timeout when user touches
                              if (blurTimeoutRef.current) {
                                clearTimeout(blurTimeoutRef.current);
                                blurTimeoutRef.current = null;
                              }
                            }}
                            onPress={() => {
                              console.log(
                                `👆 TouchableOpacity PRESS for suggestion: ${suggestion.main_text}`
                              );
                              handleAutocompleteSuggestionSelect(suggestion);
                            }}
                            onPressOut={() => {
                              console.log(
                                `🔥 Press OUT for: ${suggestion.main_text}`
                              );
                              isTouchingRef.current = false;
                            }}
                          >
                            <Ionicons
                              name="location"
                              size={16}
                              color={COLORS.mutedTeal}
                            />
                            <View style={styles.suggestionTextContainer}>
                              {suggestion.type === "message" ? (
                                <Text style={styles.suggestionMainText}>
                                  {suggestion.title}
                                </Text>
                              ) : (
                                <>
                                  <Text style={styles.suggestionMainText}>
                                    {suggestion.main_text}
                                  </Text>
                                  {suggestion.secondary_text && (
                                    <Text
                                      style={styles.suggestionSecondaryText}
                                    >
                                      {suggestion.secondary_text}
                                    </Text>
                                  )}
                                </>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}

                  {/* Google Maps-style Suggestions (show when no text or short text) */}
                  {(!activeField ||
                    (
                      (activeField === "from" ? fromLocation : destination) ||
                      ""
                    ).length < 2) && (
                    <>
                      {/* Distance Limit Info */}
                      <View style={styles.distanceLimitInfo}>
                        <Ionicons
                          name="information-circle"
                          size={16}
                          color={COLORS.mutedTeal}
                        />
                        <Text style={styles.distanceLimitText}>
                          For your safety, routes are limited to{" "}
                          {MAX_DESTINATION_DISTANCE_MILES} miles between start
                          and destination
                        </Text>
                      </View>

                      {/* Recent Searches */}
                      {recentSearches.length > 0 && (
                        <>
                          <Text style={styles.suggestionsHeader}>Recent</Text>
                          {recentSearches.slice(0, 5).map((search, index) => (
                            <TouchableOpacity
                              key={`recent-${search.id}`}
                              style={styles.suggestionItem}
                              activeOpacity={0.7}
                              onPressIn={() => {
                                isTouchingRef.current = true;
                                if (blurTimeoutRef.current) {
                                  clearTimeout(blurTimeoutRef.current);
                                  blurTimeoutRef.current = null;
                                }
                                setIsProcessingSuggestion(true);
                              }}
                              onPress={() => {
                                handleSuggestionSelect(search);
                              }}
                              onPressOut={() => {
                                isTouchingRef.current = false;
                              }}
                            >
                              <Ionicons
                                name="time"
                                size={16}
                                color={COLORS.slateGray}
                              />
                              <Text style={styles.suggestionText}>
                                {search.title}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </>
                      )}

                      {/* Saved Places */}
                      {savedPlaces.length > 0 && (
                        <>
                          <Text style={styles.suggestionsHeader}>
                            Saved places
                          </Text>
                          {savedPlaces.map((place, index) => (
                            <TouchableOpacity
                              key={`saved-${place.id}`}
                              style={styles.suggestionItem}
                              activeOpacity={0.7}
                              onPressIn={() => {
                                isTouchingRef.current = true;
                                if (blurTimeoutRef.current) {
                                  clearTimeout(blurTimeoutRef.current);
                                  blurTimeoutRef.current = null;
                                }
                                setIsProcessingSuggestion(true);
                              }}
                              onPress={() => {
                                handleSuggestionSelect({
                                  ...place,
                                  type: "saved",
                                });
                              }}
                              onPressOut={() => {
                                isTouchingRef.current = false;
                              }}
                            >
                              <Ionicons
                                name={place.icon}
                                size={16}
                                color={COLORS.mutedTeal}
                              />
                              <View style={styles.suggestionTextContainer}>
                                <Text style={styles.suggestionMainText}>
                                  {place.title}
                                </Text>
                                <Text style={styles.suggestionSecondaryText}>
                                  {place.address}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </>
                      )}

                      {/* Contextual Suggestions */}
                      {contextualSuggestions.length > 0 && (
                        <>
                          <Text style={styles.suggestionsHeader}>
                            {new Date().getHours() < 12
                              ? "Morning suggestions"
                              : new Date().getHours() < 17
                              ? "Afternoon suggestions"
                              : new Date().getHours() < 22
                              ? "Evening suggestions"
                              : "Safety suggestions"}
                          </Text>
                          {contextualSuggestions.map((suggestion, index) => (
                            <TouchableOpacity
                              key={`contextual-${index}`}
                              style={styles.suggestionItem}
                              activeOpacity={0.7}
                              onPressIn={() => {
                                isTouchingRef.current = true;
                                if (blurTimeoutRef.current) {
                                  clearTimeout(blurTimeoutRef.current);
                                  blurTimeoutRef.current = null;
                                }
                                setIsProcessingSuggestion(true);
                              }}
                              onPress={() => {
                                handleSuggestionSelect(suggestion);
                              }}
                              onPressOut={() => {
                                isTouchingRef.current = false;
                              }}
                            >
                              <Ionicons
                                name={suggestion.icon}
                                size={16}
                                color={COLORS.mutedTeal}
                              />
                              <Text style={styles.suggestionText}>
                                {suggestion.title}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </>
                      )}

                      {/* Nearby Safety Spots */}
                      {nearbySuggestions.length > 0 && (
                        <>
                          <Text style={styles.suggestionsHeader}>
                            Nearby safety spots
                          </Text>
                          {nearbySuggestions.map((suggestion, index) => (
                            <TouchableOpacity
                              key={`nearby-${index}`}
                              style={styles.suggestionItem}
                              activeOpacity={0.7}
                              onPressIn={() => {
                                isTouchingRef.current = true;
                                if (blurTimeoutRef.current) {
                                  clearTimeout(blurTimeoutRef.current);
                                  blurTimeoutRef.current = null;
                                }
                                setIsProcessingSuggestion(true);
                              }}
                              onPress={() => {
                                handleSuggestionSelect(suggestion);
                              }}
                              onPressOut={() => {
                                isTouchingRef.current = false;
                              }}
                            >
                              <Ionicons
                                name={suggestion.icon}
                                size={16}
                                color={COLORS.safetyAmber}
                              />
                              <Text style={styles.suggestionText}>
                                {suggestion.title}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Map */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              region={isPreviewingRoute ? previewMapRegion : mapRegion}
              onRegionChangeComplete={isPreviewingRoute ? null : setMapRegion}
              mapType="standard"
              showsUserLocation={!isNavigating && !isPreviewingRoute} // Hide during navigation and preview
              showsMyLocationButton={!isNavigating && !isPreviewingRoute} // Hide during navigation and preview
              showsTraffic={false}
              showsBuildings={true}
              showsIndoors={true}
              showsPointsOfInterest={!isPreviewingRoute} // Hide POI during preview for cleaner view
              showsCompass={!isPreviewingRoute}
              showsScale={false}
              rotateEnabled={!isPreviewingRoute}
              scrollEnabled={true} // Always allow map interaction
              zoomEnabled={true}
              followsUserLocation={isNavigating} // Auto-follow during navigation
              heading={isNavigating ? currentHeading : 0} // Keep forward direction up during navigation
              camera={
                isNavigating
                  ? {
                      center: {
                        latitude:
                          liveLocation?.coords.latitude ||
                          location.coords.latitude,
                        longitude:
                          liveLocation?.coords.longitude ||
                          location.coords.longitude,
                      },
                      pitch: 45,
                      heading: currentHeading,
                      altitude: 500,
                      zoom: 18,
                    }
                  : undefined
              }
            >
              {/* Start location marker (FROM field or current location) */}
              {(fromLocationCoords || location || liveLocation) && (
                <Marker
                  coordinate={{
                    latitude:
                      fromLocationCoords?.latitude ||
                      liveLocation?.coords.latitude ||
                      location?.coords.latitude,
                    longitude:
                      fromLocationCoords?.longitude ||
                      liveLocation?.coords.longitude ||
                      location?.coords.longitude,
                  }}
                  title={fromLocation || "Your Location"}
                  anchor={{ x: 0.5, y: 0.5 }}
                  rotation={isNavigating ? currentHeading : 0}
                >
                  {isNavigating ? (
                    <View style={styles.navigationMarker}>
                      <Ionicons
                        name="navigate"
                        size={24}
                        color={COLORS.mutedTeal}
                      />
                    </View>
                  ) : (
                    <View style={styles.currentLocationMarker}>
                      <View style={styles.currentLocationInner} />
                    </View>
                  )}
                </Marker>
              )}

              {/* Destination marker */}
              {destinationCoords && (
                <Marker
                  coordinate={destinationCoords}
                  title="Destination"
                  description={destinationCoords.address}
                  pinColor={COLORS.safetyAmber}
                />
              )}

              {/* Route polyline */}
              {selectedRoute && selectedRoute.overview_polyline && (
                <Polyline
                  coordinates={GoogleMapsService.decodePolyline(
                    selectedRoute.overview_polyline.points
                  )}
                  strokeColor={SAFETY_LEVELS[selectedRoute.safetyLevel].color}
                  strokeWidth={isNavigating ? 6 : 4}
                  strokeOpacity={0.8}
                />
              )}

              {/* Navigation progress polyline - shows completed route */}
              {isNavigating && selectedRoute && liveLocation && (
                <Polyline
                  coordinates={[
                    {
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                    },
                    {
                      latitude: liveLocation.coords.latitude,
                      longitude: liveLocation.coords.longitude,
                    },
                  ]}
                  strokeColor={COLORS.safeGreen}
                  strokeWidth={4}
                  strokeOpacity={0.9}
                />
              )}

              {/* Safe spots markers - hide during preview for cleaner view */}
              {!isPreviewingRoute &&
                safeSpots.map((spot, index) => (
                  <Marker
                    key={`${spot.type}-${spot.id}-${index}`}
                    coordinate={spot.coordinate}
                    title={spot.name || spot.title}
                    description={`Safe spot: ${spot.type} • ${
                      spot.distance || "Nearby"
                    }`}
                  >
                    <View
                      style={[
                        styles.customMarker,
                        { backgroundColor: getSpotColor(spot.type) },
                      ]}
                    >
                      <Ionicons
                        name={getMarkerIcon(spot.type)}
                        size={14}
                        color={COLORS.white}
                      />
                    </View>
                  </Marker>
                ))}
            </MapView>

            {/* Route Preview Overlay */}
            {isPreviewingRoute && (
              <View style={styles.routePreviewOverlay}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>Route Preview</Text>
                  <TouchableOpacity
                    style={styles.exitPreviewButton}
                    onPress={handleExitPreview}
                  >
                    <Ionicons name="close" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewRouteText}>
                    {selectedRoute?.estimatedTime} • {selectedRoute?.distance}
                  </Text>
                  <Text style={styles.previewSafetyText}>
                    Safety Score: {selectedRoute?.safetyScore || 0}/100
                  </Text>
                </View>
              </View>
            )}

            {/* SOS Button - hide during preview */}
            {!isPreviewingRoute && (
              <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
                <Ionicons name="warning" size={24} color={COLORS.white} />
                <Text style={styles.sosText}>SOS</Text>
              </TouchableOpacity>
            )}

            {/* AI Companion Button - hide during preview */}
            {!isPreviewingRoute && (
              <TouchableOpacity
                style={[
                  styles.companionButton,
                  isAICompanionActive && styles.companionButtonActive,
                ]}
                onPress={toggleAICompanion}
              >
                <Ionicons
                  name={isAICompanionActive ? "mic" : "mic-off"}
                  size={24}
                  color={isAICompanionActive ? COLORS.white : COLORS.mutedTeal}
                />
                <Text
                  style={[
                    styles.companionText,
                    isAICompanionActive && styles.companionTextActive,
                  ]}
                >
                  {isAICompanionActive ? "AI On" : "AI Off"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Zoom Controls - show when route is selected and not navigating */}
            {selectedRoute && !isNavigating && (
              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={handleZoomIn}
                >
                  <Ionicons name="add" size={20} color={COLORS.mutedTeal} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={handleZoomOut}
                >
                  <Ionicons name="remove" size={20} color={COLORS.mutedTeal} />
                </TouchableOpacity>
              </View>
            )}

            {/* Center Location Button - only show during navigation */}
            {isNavigating && (
              <TouchableOpacity
                style={styles.centerLocationButton}
                onPress={() => {
                  if (liveLocation && mapRef.current) {
                    mapRef.current.animateToRegion(
                      {
                        latitude: liveLocation.coords.latitude,
                        longitude: liveLocation.coords.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      },
                      1000
                    );
                  }
                }}
              >
                <Ionicons name="locate" size={24} color={COLORS.mutedTeal} />
              </TouchableOpacity>
            )}
          </View>

          {/* Navigation Status Panel */}
          {isNavigating && selectedRoute && (
            <ScrollView
              style={styles.navigationScrollContainer}
              contentContainerStyle={styles.navigationScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              <View style={styles.navigationPanel}>
                <View style={styles.navigationHeader}>
                  <View style={styles.navigationInfo}>
                    <View style={styles.navigationText}>
                      <Text style={styles.navigationTitle}>{destination}</Text>
                      <Text style={styles.navigationSubtitle}>
                        {estimatedArrival
                          ? `ETA: ${estimatedArrival.toLocaleTimeString()}`
                          : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.navigationStats}>
                    <Text style={styles.navigationDistance}>
                      {selectedRoute.distance ||
                        (selectedRoute.legs &&
                          selectedRoute.legs[0] &&
                          selectedRoute.legs[0].distance &&
                          selectedRoute.legs[0].distance.text) ||
                        "Unknown distance"}
                    </Text>
                    <Text style={styles.navigationTime}>
                      {selectedRoute.estimatedTime ||
                        (selectedRoute.legs &&
                          selectedRoute.legs[0] &&
                          selectedRoute.legs[0].duration &&
                          selectedRoute.legs[0].duration.text) ||
                        "Unknown time"}
                    </Text>
                  </View>
                </View>
                <View style={styles.safetyFeatures}>
                  <View style={styles.safetyFeature}>
                    <Ionicons
                      name="shield-checkmark"
                      size={16}
                      color={COLORS.safeGreen}
                    />
                    <Text style={styles.safetyFeatureText}>Live Tracking</Text>
                  </View>
                  <View style={styles.safetyFeature}>
                    <Ionicons
                      name="location"
                      size={16}
                      color={COLORS.mutedTeal}
                    />
                    <Text style={styles.safetyFeatureText}>
                      Navigation Active
                    </Text>
                  </View>
                </View>{" "}
                {/* Stop Navigation Button inside the panel */}
                <TouchableOpacity
                  style={styles.stopNavigationButton}
                  onPress={handleStopNavigation}
                >
                  <Ionicons name="stop" size={20} color={COLORS.white} />
                  <Text style={styles.stopNavigationText}>Stop Navigation</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Bottom Panel - hide during preview */}
          {routes.length > 0 && !isNavigating && !isPreviewingRoute && (
            <ScrollView
              style={styles.bottomScrollContainer}
              contentContainerStyle={styles.bottomScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              <View style={styles.bottomPanel}>
                {/* Route Filter Options in Bottom Panel */}
                <View style={styles.routeFilterInPanel}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.routeFilterScroll}
                  >
                    <TouchableOpacity
                      key="filter-safe"
                      style={[
                        styles.routeFilterButton,
                        routeFilterMode === "safe" &&
                          styles.routeFilterButtonActive,
                      ]}
                      onPress={() => {
                        setRouteFilterMode("safe");
                        if (destinationCoords) handleDestinationSearch();
                      }}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={16}
                        color={
                          routeFilterMode === "safe"
                            ? COLORS.white
                            : COLORS.mutedTeal
                        }
                      />
                      <Text
                        style={[
                          styles.routeFilterText,
                          routeFilterMode === "safe" &&
                            styles.routeFilterTextActive,
                        ]}
                      >
                        Safest
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      key="filter-fastest"
                      style={[
                        styles.routeFilterButton,
                        routeFilterMode === "fastest" &&
                          styles.routeFilterButtonActive,
                      ]}
                      onPress={() => {
                        setRouteFilterMode("fastest");
                        if (destinationCoords) handleDestinationSearch();
                      }}
                    >
                      <Ionicons
                        name="speedometer"
                        size={16}
                        color={
                          routeFilterMode === "fastest"
                            ? COLORS.white
                            : COLORS.mutedTeal
                        }
                      />
                      <Text
                        style={[
                          styles.routeFilterText,
                          routeFilterMode === "fastest" &&
                            styles.routeFilterTextActive,
                        ]}
                      >
                        Fastest
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      key="filter-all"
                      style={[
                        styles.routeFilterButton,
                        routeFilterMode === "all" &&
                          styles.routeFilterButtonActive,
                      ]}
                      onPress={() => {
                        setRouteFilterMode("all");
                        if (destinationCoords) handleDestinationSearch();
                      }}
                    >
                      <Ionicons
                        name="list"
                        size={16}
                        color={
                          routeFilterMode === "all"
                            ? COLORS.white
                            : COLORS.mutedTeal
                        }
                      />
                      <Text
                        style={[
                          styles.routeFilterText,
                          routeFilterMode === "all" &&
                            styles.routeFilterTextActive,
                        ]}
                      >
                        All Options
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.routeOptions}
                >
                  {routes.map((route, index) => (
                    <TouchableOpacity
                      key={`route-${
                        route.id ||
                        `${index}-${route.safetyLevel || "unknown"}-${
                          route.distance || "unknown"
                        }`
                      }`}
                      style={[
                        styles.routeOption,
                        selectedRoute?.id === route.id &&
                          styles.selectedRouteOption,
                      ]}
                      onPress={() => selectRoute(route)}
                    >
                      <View style={styles.routeHeader}>
                        <View
                          style={[
                            styles.safetyIndicator,
                            {
                              backgroundColor:
                                SAFETY_LEVELS[route.safetyLevel]?.color ||
                                COLORS.slateGray,
                            },
                          ]}
                        />
                        <Text style={styles.safetyLabel}>
                          {SAFETY_LEVELS[route.safetyLevel]?.label || "Unknown"}
                        </Text>
                        <Text style={styles.safetyScore}>
                          {route.safetyScore || 0}/100
                        </Text>
                      </View>

                      {/* Route Type */}
                      {route.routeType && (
                        <Text style={styles.routeTypeText}>
                          {route.routeType}
                        </Text>
                      )}

                      <Text style={styles.routeText}>
                        Route {index + 1}
                        {index === 0 && (
                          <Text style={styles.bestRouteIndicator}>
                            {" • Best for "}
                            {routeFilterMode === "safe"
                              ? "Safety"
                              : routeFilterMode === "fastest"
                              ? "Speed"
                              : "Balance"}
                          </Text>
                        )}
                      </Text>
                      <Text style={styles.routeDetails}>
                        {route.estimatedTime} • {route.distance}
                      </Text>

                      {route.legs &&
                        route.legs[0] &&
                        route.legs[0].steps &&
                        route.legs[0].steps.length > 0 && (
                          <Text
                            style={styles.routeDescription}
                            numberOfLines={2}
                          >
                            Via{" "}
                            {route.legs[0].steps[0].html_instructions.replace(
                              /<[^>]*>/g,
                              ""
                            )}
                          </Text>
                        )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {selectedRoute && (
                  <View style={styles.navigationButtonsContainer}>
                    <TouchableOpacity
                      style={styles.previewRouteButton}
                      onPress={handlePreviewRoute}
                    >
                      <Ionicons name="eye" size={20} color={COLORS.deepNavy} />
                      <Text style={styles.previewRouteText}>Preview Route</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.startNavigationButton}
                      onPress={handleStartNavigation}
                    >
                      <Ionicons
                        name="navigate"
                        size={20}
                        color={COLORS.white}
                      />
                      <Text style={styles.startNavigationText}>
                        Start Navigation
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </TouchableWithoutFeedback>

      {/* Immersive Route Preview Modal */}
      <ImmersiveRoutePreview
        visible={showImmersivePreview}
        route={selectedRoute}
        startLocation={memoizedStartLocation}
        endLocation={destinationCoords}
        safeSpots={safeSpots}
        onClose={handleImmersivePreviewClose}
        onStartNavigation={handleImmersivePreviewStartNavigation}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  searchContainer: {
    position: "absolute", // Enable positioning context for absolute children
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    marginTop: SPACING.xxl,
    zIndex: 1000, // Ensure search container appears above other elements
    ...SHADOWS.light,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.medium,
    color: COLORS.deepNavy,
    fontFamily: FONTS.body,
  },
  searchBarActive: {
    borderWidth: 2,
    borderColor: COLORS.mutedTeal,
  },
  toField: {
    marginTop: SPACING.xs,
  },
  swapButton: {
    position: "absolute",
    right: SPACING.md,
    top: 45, // Position between the two fields
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    ...SHADOWS.light,
  },
  suggestionsContainer: {
    position: "absolute",
    top: 120, // Position below both search bars (approximate height for two fields)
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 150, // Minimum height to show suggestions
    maxHeight: height * 0.5, // Increased height for more categories
    zIndex: 1001, // Higher than search container
    ...SHADOWS.medium,
  },
  suggestionsList: {
    flex: 1,
    maxHeight: height * 0.5, // Ensure ScrollView has bounded height
  },
  suggestionsContent: {
    flexGrow: 1,
    paddingBottom: SPACING.sm, // Add padding for better scrolling experience
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
  },
  loadingText: {
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
  },
  suggestionsHeader: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.warmBeige,
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderTopRightRadius: BORDER_RADIUS.md,
  },
  suggestionsHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.warmBeige,
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderTopRightRadius: BORDER_RADIUS.md,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.warmBeige,
  },
  suggestionText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.medium,
    color: COLORS.deepNavy,
  },
  suggestionTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  suggestionMainText: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.medium,
    color: COLORS.deepNavy,
  },
  suggestionSecondaryText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    marginTop: 2,
  },
  // Distance limit info styles
  distanceLimitInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.warmBeige,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mutedTeal,
  },
  distanceLimitText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.small,
    color: COLORS.deepNavy,
    fontStyle: "italic",
  },
  // Route Filter Styles
  routeFilterInPanel: {
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  routeFilterScroll: {
    flexGrow: 0,
  },
  routeFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.mutedTeal,
  },
  routeFilterButtonActive: {
    backgroundColor: COLORS.mutedTeal,
    borderColor: COLORS.mutedTeal,
  },
  routeFilterText: {
    marginLeft: SPACING.xs,
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.mutedTeal,
  },
  routeFilterTextActive: {
    color: COLORS.white,
  },
  // Route Display Enhancement Styles
  routeModeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  travelModeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.mutedTeal,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.xs,
  },
  travelModeText: {
    marginLeft: 4,
    fontSize: FONTS.sizes.tiny,
    fontWeight: FONTS.weights.medium,
    color: COLORS.white,
  },
  routeTypeText: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.slateGray,
    fontStyle: "italic",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  sosButton: {
    position: "absolute",
    top: SPACING.xl * 4, // Moved lower from the top
    right: SPACING.md,
    backgroundColor: COLORS.warningRed,
    width: 70,
    height: 70,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.heavy,
  },
  sosText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.bold,
    marginTop: 2,
  },
  companionButton: {
    position: "absolute",
    top: SPACING.xl * 4 + 80, // Position below SOS button (70px height + 10px spacing)
    right: SPACING.md,
    backgroundColor: COLORS.warmBeige,
    borderWidth: 2,
    borderColor: COLORS.mutedTeal,
    width: 70,
    height: 70,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
  },
  companionButtonActive: {
    backgroundColor: COLORS.mutedTeal,
    borderColor: COLORS.mutedTeal,
  },
  companionText: {
    color: COLORS.mutedTeal,
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
    marginTop: 2,
  },
  companionTextActive: {
    color: COLORS.white,
  },
  centerLocationButton: {
    position: "absolute",
    bottom: "30%", // Positioned in the middle-lower section of the screen
    right: SPACING.md,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.mutedTeal,
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
  },
  bottomPanel: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    ...SHADOWS.heavy,
  },
  bottomScrollContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.5, // Allow more space for scrolling
    backgroundColor: "transparent",
  },
  bottomScrollContent: {
    flexGrow: 1,
  },
  navigationScrollContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.6, // Allow more space for navigation panel
    backgroundColor: "transparent",
  },
  navigationScrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.lg, // Add padding for better scrolling
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  routeTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
  },
  routeOptions: {
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  routeOption: {
    backgroundColor: COLORS.warmBeige,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    width: 200,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedRouteOption: {
    borderColor: COLORS.mutedTeal,
    backgroundColor: COLORS.white,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  safetyIndicator: {
    width: 12,
    height: 12,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
  },
  safetyLabel: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.deepNavy,
    flex: 1,
  },
  safetyScore: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
  },
  routeText: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.medium,
    color: COLORS.deepNavy,
    marginBottom: 2,
  },
  bestRouteIndicator: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.mutedTeal,
    fontStyle: "italic",
  },
  routeDetails: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    marginBottom: SPACING.sm,
  },
  routeDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    fontStyle: "italic",
  },
  customMarker: {
    width: 24,
    height: 24,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.mutedTeal,
    borderWidth: 3,
    borderColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 10, // Adjust as needed
    right: 10, // Adjust as needed
    ...SHADOWS.medium,
  },
  currentLocationInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  navigationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.mutedTeal,
    ...SHADOWS.medium,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.warmBeige,
    borderRadius: 3,
    marginRight: SPACING.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.mutedTeal,
    borderRadius: 3,
  },
  progressText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.mutedTeal,
    minWidth: 35,
  },
  startNavigationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.mutedTeal,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  startNavigationText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    marginLeft: SPACING.sm,
  },
  // Route Preview Styles
  navigationButtonsContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  previewRouteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.warmBeige,
    borderWidth: 1,
    borderColor: COLORS.mutedTeal,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.light,
  },
  previewRouteText: {
    color: COLORS.deepNavy,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    marginLeft: SPACING.sm,
  },
  routePreviewOverlay: {
    position: "absolute",
    top: SPACING.xl * 4, // Position below search bar (search bar is at SPACING.xxl + height)
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.deepNavy,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.heavy,
    zIndex: 999, // Lower than search container but above map
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  previewTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  exitPreviewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.slateGray,
    justifyContent: "center",
    alignItems: "center",
  },
  previewInfo: {
    alignItems: "center",
  },
  previewSafetyText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.warmBeige,
  },
  navigationPanel: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.medium,
  },
  stopNavigationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.warningRed,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  stopNavigationText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    marginLeft: SPACING.sm,
  },
  navigationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  navigationInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  navigationText: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  navigationTitle: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
  },
  navigationSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    marginTop: 2,
  },
  navigationStats: {
    alignItems: "flex-end",
  },
  navigationDistance: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.bold,
    color: COLORS.mutedTeal,
  },
  navigationTime: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
  },
  instructionContainer: {
    backgroundColor: COLORS.warmBeige,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginVertical: SPACING.sm,
  },
  instructionText: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.deepNavy,
    fontWeight: FONTS.weights.medium,
    textAlign: "center",
  },
  safetyFeatures: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: SPACING.sm,
  },
  safetyFeature: {
    flexDirection: "row",
    alignItems: "center",
  },
  safetyFeatureText: {
    marginLeft: SPACING.xs,
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    fontWeight: FONTS.weights.medium,
  },
  // Zoom Controls
  zoomControls: {
    position: "absolute",
    bottom: "45%", // Position above center location button
    left: SPACING.md,
    flexDirection: "column",
    gap: SPACING.xs,
  },
  zoomButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.mutedTeal,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
  },
});
