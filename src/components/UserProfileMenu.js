import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";

export const UserProfileMenu = () => {
  const [showMenu, setShowMenu] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setShowMenu(false);
          try {
            await signOut();
          } catch (error) {
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(" ");
      return names.map((name) => name.charAt(0).toUpperCase()).join("");
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => setShowMenu(true)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getUserInitials()}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.userInfo}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarTextLarge}>{getUserInitials()}</Text>
              </View>
              <Text style={styles.userName}>
                {user?.user_metadata?.full_name || "User"}
              </Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
              <Ionicons
                name="log-out-outline"
                size={20}
                color={COLORS.deepNavy}
              />
              <Text style={styles.menuItemText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  profileButton: {
    position: "absolute",
    top: 50,
    right: SPACING.lg,
    zIndex: 1000,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.mutedTeal,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    margin: SPACING.lg,
    minWidth: 250,
    ...SHADOWS.heavy,
  },
  userInfo: {
    alignItems: "center",
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.warmBeige,
    marginBottom: SPACING.lg,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.mutedTeal,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  avatarTextLarge: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
  },
  userName: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginBottom: SPACING.xs,
  },
  userEmail: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  menuItemText: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.deepNavy,
    marginLeft: SPACING.md,
    fontWeight: FONTS.weights.medium,
  },
});
