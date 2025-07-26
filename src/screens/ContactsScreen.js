import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../constants/theme";

export default function ContactsScreen() {
  const [trustedContacts, setTrustedContacts] = useState([
    {
      id: 1,
      name: "Sarah Johnson",
      phone: "+1 (555) 123-4567",
      relationship: "Best Friend",
      isEmergencyContact: true,
    },
    {
      id: 2,
      name: "Mom",
      phone: "+1 (555) 987-6543",
      relationship: "Mother",
      isEmergencyContact: true,
    },
    {
      id: 3,
      name: "David Wilson",
      phone: "+1 (555) 456-7890",
      relationship: "Partner",
      isEmergencyContact: false,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");

  const handleAddContact = () => {
    Alert.alert(
      "Add Trusted Contact",
      "This would open contact selection or manual entry form.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Add", onPress: () => console.log("Add contact") },
      ]
    );
  };

  const handleContactPress = (contact) => {
    Alert.alert(contact.name, "What would you like to do?", [
      { text: "Cancel", style: "cancel" },
      { text: "Call", onPress: () => console.log("Call", contact.phone) },
      { text: "Send Alert", onPress: () => handleSendAlert(contact) },
      { text: "Edit", onPress: () => console.log("Edit", contact.id) },
    ]);
  };

  const handleSendAlert = (contact) => {
    Alert.alert(
      "Alert Sent",
      `Safety alert sent to ${contact.name}. They will receive your location and status.`
    );
  };

  const toggleEmergencyContact = (contactId) => {
    setTrustedContacts((prevContacts) =>
      prevContacts.map((contact) =>
        contact.id === contactId
          ? { ...contact, isEmergencyContact: !contact.isEmergencyContact }
          : contact
      )
    );
  };

  const filteredContacts = trustedContacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.relationship.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactPress(item)}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.contactInitial}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.isEmergencyContact && (
            <View style={styles.emergencyBadge}>
              <Ionicons name="warning" size={12} color={COLORS.white} />
            </View>
          )}
        </View>
        <Text style={styles.contactRelationship}>{item.relationship}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>

      <View style={styles.contactActions}>
        <TouchableOpacity
          style={styles.emergencyToggle}
          onPress={() => toggleEmergencyContact(item.id)}
        >
          <Ionicons
            name={item.isEmergencyContact ? "star" : "star-outline"}
            size={20}
            color={
              item.isEmergencyContact ? COLORS.safetyAmber : COLORS.slateGray
            }
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.callButton}>
          <Ionicons name="call" size={18} color={COLORS.mutedTeal} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trusted Contacts</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.slateGray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={COLORS.slateGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Emergency Contacts Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons
            name="information-circle"
            size={20}
            color={COLORS.mutedTeal}
          />
          <Text style={styles.infoTitle}>Emergency Contacts</Text>
        </View>
        <Text style={styles.infoText}>
          Contacts marked with ⭐ will be automatically notified in emergency
          situations or if you fail to check in.
        </Text>
      </View>

      {/* Contacts List */}
      <FlatList
        data={filteredContacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.contactsList}
        showsVerticalScrollIndicator={false}
      />

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton}>
          <Ionicons name="notifications" size={20} color={COLORS.white} />
          <Text style={styles.quickActionText}>Send Check-in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionButton, styles.alertButton]}
        >
          <Ionicons name="warning" size={20} color={COLORS.white} />
          <Text style={styles.quickActionText}>Send Alert</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  },
  addButton: {
    backgroundColor: COLORS.mutedTeal,
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
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
  contactsList: {
    paddingHorizontal: SPACING.md,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.light,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.mutedTeal,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  contactInitial: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  contactName: {
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.deepNavy,
    marginRight: SPACING.sm,
  },
  emergencyBadge: {
    backgroundColor: COLORS.safetyAmber,
    width: 18,
    height: 18,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
  },
  contactRelationship: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: FONTS.sizes.small,
    color: COLORS.slateGray,
  },
  contactActions: {
    alignItems: "center",
    gap: SPACING.sm,
  },
  emergencyToggle: {
    padding: SPACING.xs,
  },
  callButton: {
    backgroundColor: COLORS.warmBeige,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.mutedTeal,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  alertButton: {
    backgroundColor: COLORS.safetyAmber,
  },
  quickActionText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    marginLeft: SPACING.sm,
  },
});
