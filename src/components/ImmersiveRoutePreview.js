import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
  Modal,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../constants/theme";
import { GoogleMapsService } from "../services/GoogleMapsService";

const { width, height } = Dimensions.get("window");

function ImmersiveRoutePreview({
  visible,
  route,
  startLocation,
  endLocation,
  safeSpots,
  onClose,
  onStartNavigation,
}) {
  const [currentCheckpoint, setCurrentCheckpoint] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false); // Start paused
  const [cameraAngle, setCameraAngle] = useState(0);
  const [mapRegion, setMapRegion] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [safetyOverlays, setSafetyOverlays] = useState([]);
  const [streetViewMode, setStreetViewMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const mapRef = useRef(null);
  const autoPlayRef = useRef(null);
  const panY = useRef(new Animated.Value(0)).current;
  const transitionTimeoutRef = useRef(null);

  // Development logging to understand re-renders
  useEffect(() => {
    if (__DEV__) {
      console.log("[ImmersiveRoutePreview] Component rendered with props:", {
        visible,
        hasRoute: !!route,
        hasStartLocation: !!startLocation,
        hasEndLocation: !!endLocation,
        safeSpots: safeSpots?.length || 0,
      });

      if (!visible && !route) {
        console.log(
          "[ImmersiveRoutePreview] Early return - not visible and no route"
        );
      }
    }
  });

  // Initialize checkpoints from route
  useEffect(() => {
    if (route && startLocation && endLocation) {
      const routeCoordinates = GoogleMapsService.decodePolyline(
        route.overview_polyline.points
      );
      generateCheckpoints(routeCoordinates);
      generateSafetyOverlays(routeCoordinates);

      // Set initial region with better bounds
      const bounds = calculateRouteBounds(routeCoordinates);
      setMapRegion(bounds);

      // Initial camera setup with delay to ensure map is ready
      setTimeout(() => {
        if (mapRef.current && checkpoints.length > 0) {
          animateToCheckpoint(0, false);
        }
      }, 500);
    }
  }, [route, startLocation, endLocation]);

  // Auto-play functionality with better timing
  useEffect(() => {
    if (isAutoPlaying && checkpoints.length > 0 && !isTransitioning) {
      autoPlayRef.current = setInterval(() => {
        setCurrentCheckpoint((prev) => {
          if (prev >= checkpoints.length - 1) {
            setIsAutoPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 4000); // Increased interval for smoother experience
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, checkpoints, isTransitioning]);

  // Update camera position when checkpoint changes with debouncing
  useEffect(() => {
    if (checkpoints[currentCheckpoint] && mapRef.current) {
      // Clear any pending transitions
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      // Debounce the transition to prevent jittery movement
      transitionTimeoutRef.current = setTimeout(() => {
        animateToCheckpoint(currentCheckpoint, true);
      }, 100);
    }

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [currentCheckpoint, streetViewMode, checkpoints]);

  const generateCheckpoints = (routeCoordinates) => {
    const checkpointInterval = Math.max(
      1,
      Math.floor(routeCoordinates.length / 8)
    );
    const newCheckpoints = [];

    for (let i = 0; i < routeCoordinates.length; i += checkpointInterval) {
      const coord = routeCoordinates[i];
      newCheckpoints.push({
        ...coord,
        index: Math.floor(i / checkpointInterval),
        progress: (i / routeCoordinates.length) * 100,
        instruction: generateCheckpointInstruction(i, routeCoordinates),
      });
    }

    // Always include the destination
    if (
      newCheckpoints[newCheckpoints.length - 1] !==
      routeCoordinates[routeCoordinates.length - 1]
    ) {
      newCheckpoints.push({
        ...routeCoordinates[routeCoordinates.length - 1],
        index: newCheckpoints.length,
        progress: 100,
        instruction: "You have arrived at your destination",
      });
    }

    setCheckpoints(newCheckpoints);
  };

  const calculateRouteBounds = (routeCoordinates) => {
    if (!routeCoordinates || routeCoordinates.length === 0) return null;

    let minLat = routeCoordinates[0].latitude;
    let maxLat = routeCoordinates[0].latitude;
    let minLng = routeCoordinates[0].longitude;
    let maxLng = routeCoordinates[0].longitude;

    routeCoordinates.forEach((coord) => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    const latPadding = (maxLat - minLat) * 0.1;
    const lngPadding = (maxLng - minLng) * 0.1;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat + latPadding, 0.01),
      longitudeDelta: Math.max(maxLng - minLng + lngPadding, 0.01),
    };
  };

  const animateToCheckpoint = (checkpointIndex, withTransition = true) => {
    if (!checkpoints[checkpointIndex] || !mapRef.current) return;

    const checkpoint = checkpoints[checkpointIndex];
    setIsTransitioning(true);

    // Calculate heading to next checkpoint
    let heading = 0;
    if (checkpointIndex < checkpoints.length - 1) {
      const nextCheckpoint = checkpoints[checkpointIndex + 1];
      heading = calculateBearing(checkpoint, nextCheckpoint);
    }

    setCameraAngle(heading);

    // Smoother camera animation
    mapRef.current.animateCamera(
      {
        center: {
          latitude: checkpoint.latitude,
          longitude: checkpoint.longitude,
        },
        pitch: streetViewMode ? 65 : 45, // Better angles for immersion
        heading: heading,
        zoom: streetViewMode ? 19 : 17, // Higher zoom for better detail
      },
      {
        duration: withTransition ? 2500 : 1000, // Longer duration for smoother animation
      }
    );

    // Mark transition as complete
    setTimeout(
      () => {
        setIsTransitioning(false);
      },
      withTransition ? 2500 : 1000
    );
  };

  const generateCheckpointInstruction = (index, routeCoordinates) => {
    const total = routeCoordinates.length;
    const progress = (index / total) * 100;

    if (progress < 25) return "Continue straight ahead";
    if (progress < 50) return "You're making good progress";
    if (progress < 75) return "More than halfway there";
    if (progress < 90) return "Almost at your destination";
    return "You have arrived";
  };

  const generateSafetyOverlays = (routeCoordinates) => {
    // Generate safety overlays along the route
    const overlays = [];

    // Sample safety levels based on coordinate patterns
    routeCoordinates.forEach((coord, index) => {
      if (index % 3 === 0) {
        // Every 3rd point
        const safetyLevel = Math.random() > 0.7 ? "warning" : "safe";
        overlays.push({
          coordinate: coord,
          level: safetyLevel,
          radius: 100,
        });
      }
    });

    setSafetyOverlays(overlays);
  };

  const calculateBearing = (start, end) => {
    const startLat = (start.latitude * Math.PI) / 180;
    const startLng = (start.longitude * Math.PI) / 180;
    const endLat = (end.latitude * Math.PI) / 180;
    const endLng = (end.longitude * Math.PI) / 180;

    const dLng = endLng - startLng;

    const y = Math.sin(dLng) * Math.cos(endLat);
    const x =
      Math.cos(startLat) * Math.sin(endLat) -
      Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    const bearing = Math.atan2(y, x);
    return ((bearing * 180) / Math.PI + 360) % 360;
  };

  const handlePrevCheckpoint = () => {
    if (currentCheckpoint > 0) {
      setCurrentCheckpoint((prev) => prev - 1);
      setIsAutoPlaying(false);
    }
  };

  const handleNextCheckpoint = () => {
    if (currentCheckpoint < checkpoints.length - 1) {
      setCurrentCheckpoint((prev) => prev + 1);
      setIsAutoPlaying(false);
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  const toggleStreetView = () => {
    setStreetViewMode(!streetViewMode);
    // Re-animate to current checkpoint with new view mode
    setTimeout(() => {
      animateToCheckpoint(currentCheckpoint, false);
    }, 100);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 50) {
        onClose();
      }
    },
  });

  // Cleanup function
  useEffect(() => {
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  // Early return with minimal logging in development
  if (!visible || !route || !checkpoints.length) {
    return null;
  }

  const routeCoordinates = GoogleMapsService.decodePolyline(
    route.overview_polyline.points
  );
  const currentProgress = checkpoints[currentCheckpoint]?.progress || 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Map View */}
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={mapRegion}
          customMapStyle={GoogleMapsService.getImmersiveMapStyle()}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          showsBuildings={true}
          showsIndoors={true}
          showsPointsOfInterest={true}
          showsTraffic={false}
          pitchEnabled={true}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
          mapType="standard"
          loadingEnabled={true}
          loadingIndicatorColor={COLORS.mutedTeal}
          moveOnMarkerPress={false}
          onMapReady={() => {
            // Initial setup when map is ready
            if (checkpoints.length > 0) {
              setTimeout(() => animateToCheckpoint(0, false), 200);
            }
          }}
        >
          {/* Route Polyline with better styling */}
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#4285F4" // Google Maps blue
            strokeWidth={8}
            lineJoin="round"
            lineCap="round"
          />

          {/* Safety Overlays */}
          {safetyOverlays.map((overlay, index) => (
            <Marker
              key={`safety-${index}`}
              coordinate={overlay.coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={[
                  styles.safetyOverlay,
                  overlay.level === "warning"
                    ? styles.warningOverlay
                    : styles.safeOverlay,
                ]}
              />
            </Marker>
          ))}

          {/* Safe Spots */}
          {safeSpots.map((spot) => (
            <Marker
              key={spot.id}
              coordinate={spot.coordinate}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.safeSpotMarker}>
                <Ionicons
                  name={
                    spot.type === "police"
                      ? "shield"
                      : spot.type === "hospital"
                      ? "medical"
                      : "storefront"
                  }
                  size={16}
                  color={COLORS.white}
                />
              </View>
            </Marker>
          ))}

          {/* Checkpoints */}
          {checkpoints.map((checkpoint, index) => (
            <Marker
              key={`checkpoint-${index}`}
              coordinate={checkpoint}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={[
                  styles.checkpointMarker,
                  index === currentCheckpoint && styles.activeCheckpoint,
                  index < currentCheckpoint && styles.completedCheckpoint,
                ]}
              >
                <Text style={styles.checkpointText}>{index + 1}</Text>
              </View>
            </Marker>
          ))}

          {/* Start and End Markers */}
          <Marker coordinate={startLocation} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.startMarker}>
              <Ionicons name="play" size={20} color={COLORS.white} />
            </View>
          </Marker>

          <Marker coordinate={endLocation} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.endMarker}>
              <Ionicons name="flag" size={20} color={COLORS.white} />
            </View>
          </Marker>
        </MapView>

        {/* Header Controls */}
        <View style={styles.headerControls}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Route Preview</Text>
            <Text style={styles.headerSubtitle}>
              Checkpoint {currentCheckpoint + 1} of {checkpoints.length}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.streetViewButton}
            onPress={toggleStreetView}
          >
            <Ionicons
              name={streetViewMode ? "map" : "eye"}
              size={24}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${currentProgress}%`,
                  backgroundColor: isTransitioning
                    ? COLORS.safetyAmber
                    : COLORS.mutedTeal,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(currentProgress)}%
          </Text>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />

          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              {checkpoints[currentCheckpoint]?.instruction ||
                "Follow the route"}
            </Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                (currentCheckpoint === 0 || isTransitioning) &&
                  styles.disabledButton,
              ]}
              onPress={handlePrevCheckpoint}
              disabled={currentCheckpoint === 0 || isTransitioning}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.deepNavy} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.playButton,
                isTransitioning && styles.disabledButton,
              ]}
              onPress={toggleAutoPlay}
              disabled={isTransitioning}
            >
              <Ionicons
                name={isAutoPlaying ? "pause" : "play"}
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlButton,
                (currentCheckpoint === checkpoints.length - 1 ||
                  isTransitioning) &&
                  styles.disabledButton,
              ]}
              onPress={handleNextCheckpoint}
              disabled={
                currentCheckpoint === checkpoints.length - 1 || isTransitioning
              }
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.deepNavy}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.startNavigationButton}
            onPress={onStartNavigation}
          >
            <Ionicons name="navigate" size={20} color={COLORS.white} />
            <Text style={styles.startNavigationText}>Start Navigation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepNavy,
  },
  map: {
    flex: 1,
  },
  headerControls: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.white,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.warmBeige,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  streetViewButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    position: "absolute",
    top: 120,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    marginRight: SPACING.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.mutedTeal,
    borderRadius: 3,
  },
  progressText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.white,
    fontWeight: FONTS.weights.medium,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: 40,
    ...SHADOWS.large,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.neutralGray,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  instructionContainer: {
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  instructionText: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.deepNavy,
    fontWeight: FONTS.weights.medium,
    textAlign: "center",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.warmBeige,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: SPACING.md,
  },
  disabledButton: {
    backgroundColor: COLORS.neutralGray,
    opacity: 0.5,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.mutedTeal,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: SPACING.md,
  },
  startNavigationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.deepNavy,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  startNavigationText: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.white,
    fontWeight: FONTS.weights.semibold,
    marginLeft: SPACING.sm,
  },
  safetyOverlay: {
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.7,
  },
  safeOverlay: {
    backgroundColor: COLORS.safeGreen,
  },
  warningOverlay: {
    backgroundColor: COLORS.safetyAmber,
  },
  safeSpotMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.mutedTeal,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  checkpointMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.neutralGray,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  activeCheckpoint: {
    backgroundColor: COLORS.mutedTeal,
  },
  completedCheckpoint: {
    backgroundColor: COLORS.safeGreen,
  },
  checkpointText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.white,
    fontWeight: FONTS.weights.bold,
  },
  startMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.safeGreen,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  endMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.softCoral,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.white,
  },
});

// Custom comparison function for React.memo
const areEqual = (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.route === nextProps.route &&
    prevProps.startLocation === nextProps.startLocation &&
    prevProps.endLocation === nextProps.endLocation &&
    prevProps.safeSpots?.length === nextProps.safeSpots?.length &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onStartNavigation === nextProps.onStartNavigation
  );
};

export default React.memo(ImmersiveRoutePreview, areEqual);
