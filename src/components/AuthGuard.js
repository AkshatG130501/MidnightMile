import React from "react";
import { View, StyleSheet } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { COLORS } from "../constants/theme";

export const AuthGuard = ({ children, fallback }) => {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Checking authentication..." />
      </View>
    );
  }

  if (!user && fallback) {
    return fallback;
  }

  return children;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
});
