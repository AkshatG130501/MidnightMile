import React, { useState, useEffect, useRef } from "react";
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
import * as Speech from "expo-speech";
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

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState("");
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [isAICompanionActive, setIsAICompanionActive] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [safeSpots, setSafeSpots] = useState([]);
  const [mapTheme, setMapTheme] = useState(GoogleMapsService.getMapTheme()); // Auto-detect based on time
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [isLoadingAutocomplete, setIsLoadingAutocomplete] = useState(false);
  const [isProcessingSuggestion, setIsProcessingSuggestion] = useState(false);
  const [currentCity, setCurrentCity] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [navigationStartTime, setNavigationStartTime] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [locationWatcher, setLocationWatcher] = useState(null);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState(0);
  const [spokenInstructions, setSpokenInstructions] = useState(new Set());
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
      id: 1,
      title: "Police Station",
      coordinate: { latitude: 37.78925, longitude: -122.4314 },
      type: "police",
    },
    {
      id: 2,
      title: "24/7 Pharmacy",
      coordinate: { latitude: 37.78625, longitude: -122.4344 },
      type: "pharmacy",
    },
    {
      id: 3,
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

      console.log('🔧 Requesting location permissions...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log('❌ Foreground location permission denied');
        Alert.alert(
          "Permission denied",
          "Location permission is required for safety features."
        );
        return;
      }
      console.log('✅ Foreground location permission granted');

      // Request background location permission for navigation
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== "granted") {
        console.log("⚠️ Background location permission denied");
      } else {
        console.log('✅ Background location permission granted');
      }

      try {
        console.log('📍 Getting current location...');
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          maximumAge: 15000, // Allow cached location up to 15 seconds old
          timeout: 10000, // 10 second timeout
        });
        
        console.log('✅ Location obtained:', {
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy
        });
        
        setLocation(currentLocation);
        setLiveLocation(currentLocation);
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
        console.error('❌ Error getting location:', locationError);
        Alert.alert(
          "Location Error",
          "Unable to get your current location. Please ensure location services are enabled in your device settings and try again."
        );
      }
    })();
  }, []);

  // Get current city name for location-based suggestions
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
          generateLocationSuggestions(city);
          console.log(`📍 Current city: ${city}`);
        }
      }
    } catch (error) {
      console.error("Error getting current city:", error);
      // Fallback suggestions if we can't get the city
      generateLocationSuggestions("Your Area");
    }
  };

  // Generate location-based suggestions
  const generateLocationSuggestions = (city) => {
    const commonPlaces = [
      `Airport, ${city}`,
      `Railway Station, ${city}`,
      `Bus Station, ${city}`,
      `Shopping Mall, ${city}`,
      `Hospital, ${city}`,
      `University, ${city}`,
      `City Center, ${city}`,
      `Market, ${city}`,
      `Restaurant, ${city}`,
      `Hotel, ${city}`,
    ];
    setSuggestions(commonPlaces);
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
      if (destination.length >= 2) {
        handleAutocompleteSearch(destination);
      } else {
        setAutocompleteSuggestions([]);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [destination, location]);

  // Show suggestions when autocomplete results are available
  useEffect(() => {
    if (
      destination.length >= 2 &&
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
      if (nextAppState === 'background' && isNavigating) {
        console.log('📱 App went to background during navigation - continuing location tracking');
      } else if (nextAppState === 'active' && isNavigating) {
        console.log('📱 App returned to foreground during navigation');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
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
      console.log('🚀 Starting live navigation tracking...');
      
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
      console.log('✅ Live navigation tracking started');
      
    } catch (error) {
      console.error('❌ Error starting live navigation:', error);
      Alert.alert(
        'Navigation Error', 
        'Unable to start live tracking. Please check location permissions.'
      );
    }
  };

  const stopLiveNavigation = () => {
    console.log('🛑 Stopping live navigation tracking...');
    
    if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }
    
    // Reset navigation states
    setCurrentStepIndex(0);
    setDistanceToNextStep(0);
    setRouteProgress(0);
    setSpokenInstructions(new Set());
    
    console.log('✅ Live navigation tracking stopped');
  };

  const updateNavigationProgress = (currentLocation) => {
    if (!selectedRoute || !selectedRoute.legs || selectedRoute.legs.length === 0) {
      return;
    }

    if (!currentLocation || !currentLocation.coords) {
      console.log('⚠️ Invalid location in updateNavigationProgress');
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
      
      // Speak next instruction if AI companion is active
      if (isAICompanionActive) {
        const nextStep = steps[currentStepIndex + 1];
        if (nextStep) {
          speakInstruction(nextStep.html_instructions);
        }
      }
    }

    // Calculate overall route progress
    const totalSteps = steps.length;
    const progress = ((currentStepIndex + 1) / totalSteps) * 100;
    setRouteProgress(progress);

    // Speak current instruction if not already spoken and AI is active
    if (isAICompanionActive && !spokenInstructions.has(currentStepIndex)) {
      speakInstruction(currentStep.html_instructions);
      setSpokenInstructions(prev => new Set([...prev, currentStepIndex]));
    }
  };

  const speakInstruction = (htmlInstruction) => {
    if (!htmlInstruction) return;
    
    // Remove HTML tags and clean up instruction
    const cleanInstruction = htmlInstruction
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    
    console.log('🗣️ Speaking instruction:', cleanInstruction);
    
    Speech.speak(cleanInstruction, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.8,
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const handleNavigationCompleted = () => {
    console.log('🎯 Navigation completed!');
    
    // Speak completion message
    if (isAICompanionActive) {
      Speech.speak('You have arrived at your destination. Navigation completed.', {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
      });
    }
    
    Alert.alert(
      'Navigation Completed',
      '🎯 You have arrived at your destination!\n\nThank you for using Midnight Mile for your safe journey.',
      [
        {
          text: 'Finish',
          onPress: () => {
            setIsNavigating(false);
            setCurrentStepIndex(0);
            setNavigationStartTime(null);
            setEstimatedArrival(null);
          }
        }
      ]
    );
  };

  const getManeuverIcon = (maneuver) => {
    const maneuverIcons = {
      'turn-left': 'arrow-back',
      'turn-right': 'arrow-forward',
      'turn-slight-left': 'arrow-back-outline',
      'turn-slight-right': 'arrow-forward-outline',
      'turn-sharp-left': 'return-up-back',
      'turn-sharp-right': 'return-up-forward',
      'uturn-left': 'return-down-back',
      'uturn-right': 'return-down-forward',
      'straight': 'arrow-up',
      'ramp-left': 'trending-up',
      'ramp-right': 'trending-up',
      'merge': 'git-merge',
      'fork-left': 'git-branch',
      'fork-right': 'git-branch',
      'ferry': 'boat',
      'roundabout-left': 'refresh-circle',
      'roundabout-right': 'refresh-circle',
    };
    
    return maneuverIcons[maneuver] || 'navigate';
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
        ...police.map((spot) => ({ ...spot, type: "police" })),
        ...hospitals.map((spot) => ({ ...spot, type: "hospital" })),
        ...pharmacies.map((spot) => ({ ...spot, type: "pharmacy" })),
      ];

      // Remove duplicates based on place ID
      const uniqueSafeSpots = allSafeSpots.filter((spot, index, self) => 
        index === self.findIndex(s => s.id === spot.id)
      );

      console.log(`✅ Loaded ${uniqueSafeSpots.length} unique safe spots from Places API (${allSafeSpots.length} total before deduplication)`);
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

    if (!location || !location.coords) {
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
      setDestinationCoords(destinationLocation);

      // Get safe routes
      const safeRoutes = await GoogleMapsService.getSafeRoutes(
        location.coords,
        destinationLocation
      );

      setRoutes(safeRoutes);
      if (safeRoutes.length > 0) {
        setSelectedRoute(safeRoutes[0]); // Select the safest route by default
      }

      // Update map region to show both origin and destination
      const midpointLat =
        (location.coords.latitude + destinationLocation.latitude) / 2;
      const midpointLng =
        (location.coords.longitude + destinationLocation.longitude) / 2;
      const latDelta =
        Math.abs(location.coords.latitude - destinationLocation.latitude) * 1.5;
      const lngDelta =
        Math.abs(location.coords.longitude - destinationLocation.longitude) *
        1.5;

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
        return "medical";
      case "hospital":
        return "medical-outline";
      default:
        return "location";
    }
  };

  const getSpotColor = (type) => {
    switch (type) {
      case "police":
        return COLORS.deepNavy;
      case "hospital":
        return COLORS.warningRed;
      case "pharmacy":
        return COLORS.safeGreen;
      default:
        return COLORS.mutedTeal;
    }
  };

  const selectRoute = (route) => {
    setSelectedRoute(route);
  };

  const handleSuggestionSelect = (suggestion) => {
    console.log(`🎯 Selected static suggestion: ${suggestion}`);
    console.log(`📍 Current location available:`, !!location);
    
    setIsProcessingSuggestion(true);
    setDestination(suggestion);
    setShowSuggestions(false);
    setAutocompleteSuggestions([]);
    
    // Small delay to allow UI update before starting search
    setTimeout(() => {
      console.log(`🚀 Starting destination search for: ${suggestion}`);
      handleDestinationSearch();
      setIsProcessingSuggestion(false);
    }, 100);
  };

  const handleAutocompleteSuggestionSelect = async (suggestion) => {
    console.log(`🎯 Suggestion selected - starting process...`);
    console.log(`📍 Suggestion details:`, suggestion);
    console.log(`📍 Current location state:`, location ? 'Available' : 'NULL');
    console.log(`📍 Location coords:`, location?.coords ? 'Available' : 'NULL');
    
    setIsProcessingSuggestion(true);
    
    try {
      // Check if location is available - with more detailed logging
      if (!location || !location.coords) {
        console.log(`❌ Location check failed - location:`, !!location, 'coords:', !!location?.coords);
        
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
    // Immediately update the input and hide suggestions for better UX
    setDestination(suggestion.main_text);
    setShowSuggestions(false);
    setAutocompleteSuggestions([]);
    setIsLoadingRoutes(true);

    console.log(`🎯 Selected suggestion: ${suggestion.main_text}`);
    console.log(`🔍 Getting place details for place_id: ${suggestion.place_id}`);

    // Get place details to get coordinates
    const placeDetails = await GoogleMapsService.getPlaceDetails(
      suggestion.place_id
    );
    console.log(`📍 Place details received:`, placeDetails);
    setDestinationCoords(placeDetails);

    console.log(`🚶 Getting safe routes from current location to destination...`);
    // Get safe routes using the place details
    const safeRoutes = await GoogleMapsService.getSafeRoutes(
      currentLocation.coords,
      placeDetails
    );

    console.log(`🗺️ Routes received:`, safeRoutes.length, 'routes');
    setRoutes(safeRoutes);
    if (safeRoutes.length > 0) {
      setSelectedRoute(safeRoutes[0]);
      console.log(`✅ Route selected successfully`);
    }

    // Update map region - with null checks
    if (currentLocation && currentLocation.coords && placeDetails) {
      const midpointLat =
        (currentLocation.coords.latitude + placeDetails.latitude) / 2;
      const midpointLng =
        (currentLocation.coords.longitude + placeDetails.longitude) / 2;
      const latDelta =
        Math.abs(currentLocation.coords.latitude - placeDetails.latitude) * 1.5;
      const lngDelta =
        Math.abs(currentLocation.coords.longitude - placeDetails.longitude) * 1.5;

      setMapRegion({
        latitude: midpointLat,
        longitude: midpointLng,
        latitudeDelta: Math.max(latDelta, 0.01),
        longitudeDelta: Math.max(lngDelta, 0.01),
      });
      
      console.log(`🗺️ Map region updated successfully`);
    } else {
      console.log(`⚠️ Skipping map region update - missing location or place details`);
    }
    
    setIsLoadingRoutes(false);
  };

  const handleInputFocus = () => {
    // Always show suggestions on focus if we have any content or static suggestions
    if (destination.length >= 2) {
      setShowSuggestions(true);
      // Trigger autocomplete immediately if not already done
      if (autocompleteSuggestions.length === 0) {
        handleAutocompleteSearch(destination);
      }
    } else if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Don't hide suggestions at all when user is actively searching and we have autocomplete results
    if (destination.length >= 2 && autocompleteSuggestions.length > 0) {
      console.log(`🔍 Input blur - but keeping suggestions visible because user is searching`);
      return;
    }
    
    console.log(`🔍 Input blur - scheduling hide in 1000ms (long delay)`);
    
    // Clear any existing blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    
    // Set new timeout with much longer delay
    blurTimeoutRef.current = setTimeout(() => {
      console.log(`🔍 Long blur timeout fired. TouchingRef: ${isTouchingRef.current}, Processing: ${isProcessingSuggestion}`);
      // Only hide if we're not touching suggestions and not processing
      if (!isTouchingRef.current && !isProcessingSuggestion) {
        console.log(`🔍 Hiding suggestions after long blur timeout`);
        setShowSuggestions(false);
      } else {
        console.log(`🔍 Keeping suggestions visible - user is still interacting`);
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

  const handleClearDestination = () => {
    // Clear the destination input and reset related state
    setDestination("");
    setDestinationCoords(null);
    setRoutes([]);
    setSelectedRoute(null);
    setAutocompleteSuggestions([]);
    setShowSuggestions(false);
    console.log("🧹 Destination cleared");
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
    setSpokenInstructions(new Set());
    
    // Calculate estimated arrival time with proper null checks
    let arrivalTime = null;
    try {
      // Check if duration exists and has text property
      const durationText = selectedRoute.estimatedTime || 
                          (selectedRoute.legs && selectedRoute.legs[0] && selectedRoute.legs[0].duration && selectedRoute.legs[0].duration.text);
      
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

    // Show confirmation and safety reminders
    const arrivalText = arrivalTime ? `\n\nEstimated arrival: ${arrivalTime.toLocaleTimeString()}` : "";
    
    Alert.alert(
      "Navigation Started",
      `🚀 Live navigation activated!\n\n🛡️ Safety Features:\n• Real-time GPS tracking\n• Turn-by-turn voice guidance\n• AI companion monitoring\n• Emergency SOS available\n• Safe spots highlighted${arrivalText}`,
      [
        {
          text: "Start Journey",
          style: "default",
          onPress: () => {
            console.log("🚀 Live navigation started successfully");
            // Enable AI companion for safety and voice instructions
            if (!isAICompanionActive) {
              setIsAICompanionActive(true);
            }
            
            // Speak initial instruction
            if (selectedRoute.legs && selectedRoute.legs[0] && selectedRoute.legs[0].steps.length > 0) {
              const firstStep = selectedRoute.legs[0].steps[0];
              speakInstruction(`Starting navigation. ${firstStep.html_instructions}`);
            }
          }
        }
      ]
    );
  };

  const handleStopNavigation = () => {
    Alert.alert(
      "Stop Navigation",
      "Are you sure you want to stop live navigation?",
      [
        {
          text: "Cancel",
          style: "cancel"
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
            setSpokenInstructions(new Set());
            
            // Stop location tracking
            if (locationWatcher) {
              locationWatcher.remove();
              setLocationWatcher(null);
            }
            
            // Stop any ongoing speech
            Speech.stop();
            
            console.log("🛑 Live navigation stopped");
          }
        }
      ]
    );
  };

  const getCurrentStep = () => {
    if (!selectedRoute || !selectedRoute.legs || selectedRoute.legs.length === 0) {
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
      const distanceText = distanceToNextStep < 1000 
        ? `${Math.round(distanceToNextStep)}m`
        : `${(distanceToNextStep / 1000).toFixed(1)}km`;
      
      return `In ${distanceText}: ${instruction}`;
    }
    
    return instruction;
  };

  const getInstructionWithDistance = () => {
    const currentStep = getCurrentStep();
    if (!currentStep) return "Continue to destination";
    
    const baseInstruction = currentStep.html_instructions.replace(/<[^>]*>/g, "");
    
    if (distanceToNextStep <= 50) {
      return `Now: ${baseInstruction}`;
    } else if (distanceToNextStep <= 100) {
      return `In ${Math.round(distanceToNextStep)}m: ${baseInstruction}`;
    } else if (distanceToNextStep < 1000) {
      return `In ${Math.round(distanceToNextStep)}m: ${baseInstruction}`;
    } else {
      return `In ${(distanceToNextStep / 1000).toFixed(1)}km: ${baseInstruction}`;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleOutsidePress}>
      <SafeAreaView style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.slateGray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where are you going?"
            placeholderTextColor={COLORS.slateGray}
            value={destination}
            onChangeText={(text) => {
              setDestination(text);
              if (text.length >= 2) {
                setShowSuggestions(true);
              } else if (text.length === 0) {
                setShowSuggestions(suggestions.length > 0);
                setAutocompleteSuggestions([]); // Clear autocomplete when text is cleared
              } else {
                // For text length 1, hide suggestions but don't clear autocomplete yet
                setShowSuggestions(false);
              }
            }}
            onSubmitEditing={handleDestinationSearch}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
          <TouchableOpacity 
            onPress={destination.trim() ? handleClearDestination : handleDestinationSearch}
          >
            <Ionicons 
              name={destination.trim() ? "close" : "arrow-forward"} 
              size={20} 
              color={destination.trim() ? COLORS.slateGray : COLORS.mutedTeal} 
            />
          </TouchableOpacity>
        </View>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
            <View 
              style={styles.suggestionsContainer}
              onStartShouldSetResponder={() => true}
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
              nestedScrollEnabled={true}
            >
              {/* Loading state for autocomplete */}
              {destination.length >= 2 &&
                isLoadingAutocomplete &&
                autocompleteSuggestions.length === 0 && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.mutedTeal} />
                    <Text style={styles.loadingText}>Searching places...</Text>
                  </View>
                )}

              {/* Autocomplete Results (show when typing and we have results) */}
              {destination.length >= 2 &&
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
                          console.log(`🔥 Press IN for: ${suggestion.main_text}`);
                          isTouchingRef.current = true;
                          setIsProcessingSuggestion(true);
                          // Clear any pending blur timeout when user touches
                          if (blurTimeoutRef.current) {
                            clearTimeout(blurTimeoutRef.current);
                            blurTimeoutRef.current = null;
                          }
                        }}
                        onPress={() => {
                          console.log(`👆 TouchableOpacity PRESS for suggestion: ${suggestion.main_text}`);
                          handleAutocompleteSuggestionSelect(suggestion);
                        }}
                        onPressOut={() => {
                          console.log(`🔥 Press OUT for: ${suggestion.main_text}`);
                          isTouchingRef.current = false;
                        }}
                      >
                        <Ionicons
                          name="location"
                          size={16}
                          color={COLORS.mutedTeal}
                        />
                        <View style={styles.suggestionTextContainer}>
                          <Text style={styles.suggestionMainText}>
                            {suggestion.main_text}
                          </Text>
                          {suggestion.secondary_text && (
                            <Text style={styles.suggestionSecondaryText}>
                              {suggestion.secondary_text}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

              {/* Static City-based Suggestions (show when no text or short text) */}
              {destination.length < 2 && suggestions.length > 0 && (
                <>
                  <Text style={styles.suggestionsHeader}>
                    Popular places in {currentCity || "your area"}:
                  </Text>
                  {suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={`static-${index}`}
                      style={styles.suggestionItem}
                      activeOpacity={0.7}
                      onPressIn={() => {
                        console.log(`🔥 Press started for static: ${suggestion}`);
                        isTouchingRef.current = true;
                        // Clear any pending blur timeout
                        if (blurTimeoutRef.current) {
                          clearTimeout(blurTimeoutRef.current);
                          blurTimeoutRef.current = null;
                        }
                        setIsProcessingSuggestion(true);
                      }}
                      onPress={() => {
                        console.log(`👆 Static suggestion TouchableOpacity pressed: ${suggestion}`);
                        handleSuggestionSelect(suggestion);
                      }}
                      onPressOut={() => {
                        console.log(`🔥 Press ended for static: ${suggestion}`);
                        isTouchingRef.current = false;
                        // Don't reset processing here - let the handler do it
                      }}
                    >
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={COLORS.mutedTeal}
                      />
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
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
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
          mapType="standard"
          showsUserLocation={!isNavigating} // Hide default user location during navigation
          showsMyLocationButton={!isNavigating} // Hide default location button during navigation
          showsTraffic={false}
          showsBuildings={true}
          showsIndoors={true}
          showsPointsOfInterest={true}
          showsCompass={true}
          showsScale={false}
          rotateEnabled={true}
          scrollEnabled={true} // Always allow map interaction
          zoomEnabled={true}
          followsUserLocation={false} // Don't auto-follow to allow manual exploration
        >
          {/* Current location marker - custom during navigation */}
          {(location || liveLocation) && (
            <Marker
              coordinate={{
                latitude: liveLocation?.coords.latitude || location.coords.latitude,
                longitude: liveLocation?.coords.longitude || location.coords.longitude,
              }}
              title="Your Location"
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={isNavigating ? currentHeading : 0}
            >
              {isNavigating ? (
                <View style={styles.navigationMarker}>
                  <Ionicons name="navigate" size={24} color={COLORS.mutedTeal} />
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
                }
              ]}
              strokeColor={COLORS.safeGreen}
              strokeWidth={4}
              strokeOpacity={0.9}
            />
          )}

          {/* Safe spots markers */}
          {safeSpots.map((spot, index) => (
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
                  size={16}
                  color={COLORS.white}
                />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* SOS Button */}
        <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
          <Ionicons name="warning" size={24} color={COLORS.white} />
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>

        {/* AI Companion Button */}
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

        {/* Center Location Button - only show during navigation */}
        {isNavigating && (
          <TouchableOpacity
            style={styles.centerLocationButton}
            onPress={() => {
              if (liveLocation && mapRef.current) {
                mapRef.current.animateToRegion({
                  latitude: liveLocation.coords.latitude,
                  longitude: liveLocation.coords.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }, 1000);
              }
            }}
          >
            <Ionicons
              name="locate"
              size={24}
              color={COLORS.mutedTeal}
            />
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
                <Ionicons 
                  name={getCurrentStep() ? getManeuverIcon(getCurrentStep().maneuver) : "navigate-circle"} 
                  size={24} 
                  color={COLORS.mutedTeal} 
                />
                <View style={styles.navigationText}>
                  <Text style={styles.navigationTitle}>
                    {Math.round(routeProgress)}% to {destination}
                  </Text>
                  <Text style={styles.navigationSubtitle}>
                    {estimatedArrival && `ETA: ${estimatedArrival.toLocaleTimeString()}`}
                    {distanceToNextStep > 0 && ` • ${distanceToNextStep < 1000 
                      ? `${Math.round(distanceToNextStep)}m` 
                      : `${(distanceToNextStep / 1000).toFixed(1)}km`} to next turn`}
                  </Text>
                </View>
              </View>
              <View style={styles.navigationStats}>
                <Text style={styles.navigationDistance}>
                  {selectedRoute.distance || 
                   (selectedRoute.legs && selectedRoute.legs[0] && selectedRoute.legs[0].distance && selectedRoute.legs[0].distance.text) || 
                   "Unknown distance"}
                </Text>
                <Text style={styles.navigationTime}>
                  {selectedRoute.estimatedTime || 
                   (selectedRoute.legs && selectedRoute.legs[0] && selectedRoute.legs[0].duration && selectedRoute.legs[0].duration.text) || 
                   "Unknown time"}
                </Text>
              </View>
            </View>
            
            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${routeProgress}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{Math.round(routeProgress)}%</Text>
            </View>
            
            <View style={styles.instructionContainer}>
              <Text style={styles.instructionText}>
                {getInstructionWithDistance()}
              </Text>
            </View>
            
            <View style={styles.safetyFeatures}>
              <View style={styles.safetyFeature}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.safeGreen} />
                <Text style={styles.safetyFeatureText}>Live Tracking</Text>
              </View>
              {isAICompanionActive && (
                <View style={styles.safetyFeature}>
                  <Ionicons name="mic" size={16} color={COLORS.mutedTeal} />
                  <Text style={styles.safetyFeatureText}>Voice Guidance</Text>
                </View>
              )}
              <View style={styles.safetyFeature}>
                <Ionicons name="location" size={16} color={COLORS.mutedTeal} />
                <Text style={styles.safetyFeatureText}>
                  Step {currentStepIndex + 1} of {selectedRoute.legs?.[0]?.steps?.length || 0}
                </Text>
              </View>
            </View>

            {/* Stop Navigation Button inside the panel */}
            <TouchableOpacity 
              style={styles.stopNavigationButton}
              onPress={handleStopNavigation}
            >
              <Ionicons 
                name="stop" 
                size={20} 
                color={COLORS.white} 
              />
              <Text style={styles.stopNavigationText}>
                Stop Navigation
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Bottom Panel */}
      {routes.length > 0 && !isNavigating && (
        <ScrollView 
          style={styles.bottomScrollContainer}
          contentContainerStyle={styles.bottomScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <View style={styles.bottomPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.routeTitle}>Safe Routes to {destination}</Text>
              {isLoadingRoutes && (
                <ActivityIndicator size="small" color={COLORS.mutedTeal} />
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.routeOptions}
            >
              {routes.map((route, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.routeOption,
                    selectedRoute?.id === route.id && styles.selectedRouteOption,
                  ]}
                  onPress={() => selectRoute(route)}
                >
                  <View style={styles.routeHeader}>
                    <View
                      style={[
                        styles.safetyIndicator,
                        {
                          backgroundColor: SAFETY_LEVELS[route.safetyLevel].color,
                        },
                      ]}
                    />
                    <Text style={styles.safetyLabel}>
                      {SAFETY_LEVELS[route.safetyLevel].label}
                    </Text>
                    <Text style={styles.safetyScore}>
                      {route.safetyScore}/100
                    </Text>
                  </View>

                  <Text style={styles.routeText}>Route {index + 1}</Text>
                  <Text style={styles.routeDetails}>
                    {route.estimatedTime} • {route.distance}
                  </Text>

                  {route.legs[0].steps.length > 0 && (
                    <Text style={styles.routeDescription} numberOfLines={2}>
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
            )}
          </View>
        </ScrollView>
      )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  searchContainer: {
    position: "relative", // Enable positioning context for absolute children
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
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
  suggestionsContainer: {
    position: "absolute",
    top: 60, // Position below the search bar (approximate height)
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    maxHeight: 200,
    zIndex: 1001, // Higher than search container
    ...SHADOWS.medium,
  },
  suggestionsList: {
    flex: 1,
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
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  sosButton: {
    position: "absolute",
    top: SPACING.md,
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
    bottom: SPACING.xl + 60, // Position above the default location button (60px for button + spacing)
    right: SPACING.md,
    backgroundColor: COLORS.warmBeige,
    borderWidth: 2,
    borderColor: COLORS.mutedTeal,
    width: 80,
    height: 80,
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
    bottom: SPACING.xl + 60 + 90, // Position above AI companion button
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
    width: 30,
    height: 30,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.mutedTeal,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  startNavigationText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    marginLeft: SPACING.sm,
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
});
