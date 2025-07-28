import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  RefreshControl,
  Platform,
  ScrollView,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../constants/theme";
import { GoogleMapsService } from "../services/GoogleMapsService";

export default function SafeSpotsScreen() {
  const [safeSpots, setSafeSpots] = useState([]);
  const [location, setLocation] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Generate unique ID for spots without place_id
  const generateUniqueId = (prefix) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get user's current location
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Load safe spots when location is available
  useEffect(() => {
    if (location) {
      loadNearbyPlaces();
    }
  }, [location, selectedCategory]);

  const getCurrentLocation = async () => {
    try {
      console.log("📍 Requesting location permissions for SafeSpotsScreen...");

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError(
          "Location permission denied. Please enable location access to find nearby safe spots."
        );
        setIsLoading(false);
        return;
      }

      console.log("📍 Getting current location...");
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 15000,
        timeout: 10000,
      });

      setLocation(currentLocation.coords);
      console.log("✅ Location obtained for SafeSpotsScreen");
    } catch (error) {
      console.error("❌ Error getting location:", error);
      setError(
        "Unable to get your location. Please check your location settings."
      );
      setIsLoading(false);
    }
  };

  const loadNearbyPlaces = async () => {
    if (!location) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log("📍 Loading nearby safe spots...");

      // Load different types of safe spots based on category
      let placesToLoad = [];

      if (selectedCategory === "all") {
        placesToLoad = [
          { type: "police", label: "police" },
          { type: "hospital", label: "hospital" },
          { type: "pharmacy", label: "pharmacy" },
          { type: "gas_station", label: "store" },
          { type: "fire_station", label: "fire" },
        ];
      } else {
        // Map UI category to Google Places API type
        const typeMapping = {
          police: "police",
          hospital: "hospital",
          pharmacy: "pharmacy",
          store: "gas_station", // Using gas stations as 24/7 stores
          fire: "fire_station",
        };

        if (typeMapping[selectedCategory]) {
          placesToLoad = [
            { type: typeMapping[selectedCategory], label: selectedCategory },
          ];
        }
      }

      // Load places for each type
      const promises = placesToLoad.map(async ({ type, label }) => {
        try {
          console.log(`🔍 Loading ${type} places...`);
          console.log(`📍 User location:`, location);
          const places = await GoogleMapsService.getNearbyPlaces(
            location,
            type,
            5000
          );
          console.log(`✅ Found ${places.length} ${type} places`);

          return places.map((place) => {
            console.log(`📏 Place ${place.name} distance: ${place.distance}`);
            return {
              ...place,
              type: label,
              // Add missing fields with defaults
              address: place.vicinity,
              isOpen24Hours:
                type === "hospital" ||
                type === "police" ||
                type === "fire_station",
              phone: "Call for info", // We'll enhance this with Place Details API later
              // distance is already formatted by GoogleMapsService.calculateDistance
            };
          });
        } catch (error) {
          console.error(`❌ Error loading ${type}:`, error);
          return [];
        }
      });

      const results = await Promise.all(promises);
      const allPlaces = results.flat();

      // Remove duplicates and sort by distance
      const uniquePlaces = allPlaces
        .filter(
          (place, index, self) =>
            index === self.findIndex((p) => p.id === place.id)
        )
        .sort((a, b) => {
          // Parse distance strings for sorting (e.g., "500m" or "1.2km")
          const getDistanceInMeters = (distStr) => {
            if (!distStr) return 0;
            const num = parseFloat(distStr);
            return distStr.includes("km") ? num * 1000 : num;
          };

          const distA = getDistanceInMeters(a.distance);
          const distB = getDistanceInMeters(b.distance);
          return distA - distB;
        });

      setSafeSpots(uniquePlaces);
      console.log(`✅ Loaded ${uniquePlaces.length} safe spots`);
    } catch (error) {
      console.error("❌ Error loading safe spots:", error);
      setError("Failed to load safe spots. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    if (location) {
      loadNearbyPlaces();
    } else {
      getCurrentLocation();
    }
  };

  const categories = [
    { id: "all", name: "All", icon: "grid-outline" },
    { id: "police", name: "Police", icon: "shield-checkmark" },
    { id: "hospital", name: "Medical", icon: "medical" },
    { id: "pharmacy", name: "Pharmacy", icon: "fitness" },
    { id: "store", name: "Stores", icon: "storefront" },
    { id: "fire", name: "Fire Dept", icon: "flame" },
  ];

  const getSpotIcon = (type) => {
    switch (type) {
      case "police":
        return "shield-checkmark";
      case "hospital":
        return "medical";
      case "pharmacy":
        return "fitness";
      case "store":
        return "storefront";
      case "fire":
        return "flame";
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
      case "store":
        return COLORS.mutedTeal;
      case "fire":
        return COLORS.safetyAmber;
      default:
        return COLORS.slateGray;
    }
  };

  const handleCall = (phone) => {
    if (phone && phone !== "Call for info") {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert(
        "Phone Number",
        "Phone number not available. You may need to search online or call directory assistance.",
        [{ text: "OK" }]
      );
    }
  };

  const handleDirections = (spot) => {
    const { latitude, longitude } = spot.coordinate;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    Linking.openURL(url).catch(() => {
      // Fallback to platform-specific maps
      const fallbackUrl =
        Platform.OS === "ios"
          ? `maps:0,0?q=${latitude},${longitude}`
          : `geo:0,0?q=${latitude},${longitude}`;

      Linking.openURL(fallbackUrl).catch(() => {
        Alert.alert("Error", "Unable to open maps application");
      });
    });
  };

  const handleSpotPress = (spot) => {
    Alert.alert(
      String(spot?.name || "Safe Spot"),
      `${String(
        spot?.address || "Address not available"
      )}\n\nDistance: ${String(spot?.distance || "Unknown")}\nPhone: ${String(
        spot?.phone || "Not available"
      )}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Call", onPress: () => handleCall(spot?.phone) },
        { text: "Directions", onPress: () => handleDirections(spot) },
      ]
    );
  };

  const filteredSpots =
    selectedCategory === "all"
      ? safeSpots
      : safeSpots.filter((spot) => spot.type === selectedCategory);

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.categoryItemActive,
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Ionicons
        name={item.icon}
        size={20}
        color={selectedCategory === item.id ? COLORS.white : COLORS.slateGray}
      />
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.id && styles.categoryTextActive,
        ]}
      >
        {String(item.name || "")}
      </Text>
    </TouchableOpacity>
  );

  const renderSpotItem = ({ item }) => {
    // Safety check to ensure item exists and has required properties
    if (!item || !item.name) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.spotItem}
        onPress={() => handleSpotPress(item)}
      >
        <View
          style={[
            styles.spotIcon,
            { backgroundColor: getSpotColor(item.type) },
          ]}
        >
          <Ionicons
            name={getSpotIcon(item.type)}
            size={24}
            color={COLORS.white}
          />
        </View>

        <View style={styles.spotInfo}>
          <View style={styles.spotHeader}>
            <Text style={styles.spotName} numberOfLines={1}>
              {String(item.name || "Unknown Location")}
            </Text>
            {item.isOpen24Hours ? (
              <View style={styles.openBadge}>
                <Text style={styles.openText}>24/7</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.spotAddress} numberOfLines={2}>
            {String(item.address || "Address not available")}
          </Text>

          <View style={styles.spotDetails}>
            <View style={styles.distanceContainer}>
              <Ionicons name="location" size={14} color={COLORS.slateGray} />
              <Text style={styles.distanceText}>
                {String(item.distance || "Unknown distance")}
              </Text>
            </View>

            {item.rating && item.rating > 0 ? (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color={COLORS.safetyAmber} />
                <Text style={styles.ratingText}>
                  {String(Number(item.rating || 0).toFixed(1))}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.spotActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCall(item.phone)}
          >
            <Ionicons name="call" size={18} color={COLORS.mutedTeal} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDirections(item)}
          >
            <Ionicons name="navigate" size={18} color={COLORS.mutedTeal} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Safe Spots Nearby</Text>
          <View style={styles.headerSubtitle}>
            <Ionicons name="location" size={16} color={COLORS.slateGray} />
            <Text style={styles.locationText}>Getting your location...</Text>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.mutedTeal} />
          <Text style={styles.loadingText}>Finding safe spots near you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Safe Spots Nearby</Text>
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={COLORS.warningRed} />
          <Text style={styles.errorTitle}>Unable to Load Safe Spots</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safe Spots Nearby</Text>
        <View style={styles.headerSubtitle}>
          <Ionicons name="location" size={16} color={COLORS.slateGray} />
          <Text style={styles.locationText}>
            {location ? "Current Location" : "Getting location..."}
          </Text>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => String(item?.id || Math.random())}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons
            name="shield-checkmark"
            size={20}
            color={COLORS.mutedTeal}
          />
          <Text style={styles.infoTitle}>Live Safety Information</Text>
        </View>
        <Text style={styles.infoText}>
          {safeSpots.length > 0
            ? `Found ${safeSpots.length} verified safe locations nearby. Pull down to refresh.`
            : "Loading verified safe locations from Google Places..."}
        </Text>
      </View>

      {/* Safe Spots List */}
      {safeSpots.length > 0 ? (
        <FlatList
          data={filteredSpots}
          renderItem={renderSpotItem}
          keyExtractor={(item) => String(item?.id || Math.random())}
          contentContainerStyle={styles.spotsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[COLORS.mutedTeal]}
              tintColor={COLORS.mutedTeal}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="location-outline"
                size={48}
                color={COLORS.slateGray}
              />
              <Text style={styles.emptyTitle}>No safe spots found</Text>
              <Text style={styles.emptyMessage}>
                Try selecting a different category or pull down to refresh.
              </Text>
            </View>
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[COLORS.mutedTeal]}
              tintColor={COLORS.mutedTeal}
            />
          }
        >
          <ActivityIndicator size="large" color={COLORS.mutedTeal} />
          <Text style={styles.loadingText}>Finding safe spots near you...</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.warmBeige,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.deepNavy,
    fontFamily: FONTS.headline,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    marginLeft: SPACING.xs,
  },
  categoriesContainer: {
    paddingVertical: SPACING.md,
  },
  categoriesList: {
    paddingHorizontal: SPACING.md,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.warmBeige,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING.sm,
  },
  categoryItemActive: {
    backgroundColor: COLORS.mutedTeal,
  },
  categoryText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    marginLeft: SPACING.xs,
    fontWeight: FONTS.weights.medium,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  infoCard: {
    backgroundColor: COLORS.warmBeige,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  infoTitle: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginLeft: SPACING.sm,
  },
  infoText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    lineHeight: 18,
  },
  spotsList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  spotItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.light,
  },
  spotIcon: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  spotInfo: {
    flex: 1,
  },
  spotHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  spotName: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    flex: 1,
  },
  openBadge: {
    backgroundColor: COLORS.safeGreen,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  openText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.white,
    fontWeight: FONTS.weights.medium,
  },
  spotAddress: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    marginBottom: SPACING.sm,
  },
  spotDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  distanceText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    marginLeft: SPACING.xs,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    marginLeft: SPACING.xs,
  },
  spotActions: {
    alignItems: "center",
    justifyContent: "space-between",
    height: 90, // Set a fixed height to accommodate both buttons
  },
  actionButton: {
    backgroundColor: COLORS.warmBeige,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.xs, // Add margin between buttons
  },
  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
  },
  loadingText: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
  },
  errorTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.mutedTeal,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  retryText: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    textAlign: "center",
    lineHeight: 20,
  },
});
