import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../constants/theme";

export default function SafeSpotsScreen() {
  const [safeSpots] = useState([
    {
      id: 1,
      name: "Central Police Station",
      type: "police",
      address: "123 Main Street, Downtown",
      distance: "0.3 miles",
      isOpen24Hours: true,
      phone: "+1 (555) 911-0000",
      rating: 4.8,
      coordinates: { latitude: 37.78925, longitude: -122.4314 },
    },
    {
      id: 2,
      name: "City General Hospital",
      type: "hospital",
      address: "456 Health Ave, Medical District",
      distance: "0.7 miles",
      isOpen24Hours: true,
      phone: "+1 (555) 123-4567",
      rating: 4.6,
      coordinates: { latitude: 37.79025, longitude: -122.4304 },
    },
    {
      id: 3,
      name: "24/7 Pharmacy Plus",
      type: "pharmacy",
      address: "789 Commerce St, Shopping Center",
      distance: "0.5 miles",
      isOpen24Hours: true,
      phone: "+1 (555) 987-6543",
      rating: 4.4,
      coordinates: { latitude: 37.78625, longitude: -122.4344 },
    },
    {
      id: 4,
      name: "QuickMart 24/7",
      type: "store",
      address: "321 Night Owl Blvd, Commercial Area",
      distance: "0.2 miles",
      isOpen24Hours: true,
      phone: "+1 (555) 456-7890",
      rating: 4.2,
      coordinates: { latitude: 37.78825, longitude: -122.4334 },
    },
    {
      id: 5,
      name: "Fire Station 12",
      type: "fire",
      address: "654 Rescue Road, Emergency District",
      distance: "0.9 miles",
      isOpen24Hours: true,
      phone: "+1 (555) 911-1212",
      rating: 4.9,
      coordinates: { latitude: 37.79125, longitude: -122.4294 },
    },
  ]);

  const [selectedCategory, setSelectedCategory] = useState("all");

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
    Linking.openURL(`tel:${phone}`);
  };

  const handleDirections = (spot) => {
    const { latitude, longitude } = spot.coordinates;
    const url = `maps:0,0?q=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Unable to open maps application");
    });
  };

  const handleSpotPress = (spot) => {
    Alert.alert(
      spot.name,
      `${spot.address}\n\nDistance: ${spot.distance}\nPhone: ${spot.phone}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Call", onPress: () => handleCall(spot.phone) },
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
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderSpotItem = ({ item }) => (
    <TouchableOpacity
      style={styles.spotItem}
      onPress={() => handleSpotPress(item)}
    >
      <View
        style={[styles.spotIcon, { backgroundColor: getSpotColor(item.type) }]}
      >
        <Ionicons
          name={getSpotIcon(item.type)}
          size={24}
          color={COLORS.white}
        />
      </View>

      <View style={styles.spotInfo}>
        <View style={styles.spotHeader}>
          <Text style={styles.spotName}>{item.name}</Text>
          {item.isOpen24Hours && (
            <View style={styles.openBadge}>
              <Text style={styles.openText}>24/7</Text>
            </View>
          )}
        </View>

        <Text style={styles.spotAddress}>{item.address}</Text>

        <View style={styles.spotDetails}>
          <View style={styles.distanceContainer}>
            <Ionicons name="location" size={14} color={COLORS.slateGray} />
            <Text style={styles.distanceText}>{item.distance}</Text>
          </View>

          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={COLORS.safetyAmber} />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safe Spots Nearby</Text>
        <View style={styles.headerSubtitle}>
          <Ionicons name="location" size={16} color={COLORS.slateGray} />
          <Text style={styles.locationText}>Current Location</Text>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
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
          <Text style={styles.infoTitle}>Safety Information</Text>
        </View>
        <Text style={styles.infoText}>
          These are verified safe locations open 24/7. Tap any location to call
          or get directions.
        </Text>
      </View>

      {/* Safe Spots List */}
      <FlatList
        data={filteredSpots}
        renderItem={renderSpotItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.spotsList}
        showsVerticalScrollIndicator={false}
      />
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
    gap: SPACING.sm,
  },
  actionButton: {
    backgroundColor: COLORS.warmBeige,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
});
