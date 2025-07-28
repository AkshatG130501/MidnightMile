import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import * as Location from "expo-location";
import * as SMS from "expo-sms";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../constants/theme";

export default function ContactsScreen() {
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Storage keys
  const TRUSTED_CONTACTS_KEY = "trusted_contacts";

  // Load trusted contacts from storage on component mount
  useEffect(() => {
    loadTrustedContacts();
  }, []);

  // Debug: Monitor trusted contacts changes
  useEffect(() => {
    console.log("📋 Trusted contacts state updated:", trustedContacts.length, "contacts");
    trustedContacts.forEach((contact, index) => {
      console.log(`📋 Contact ${index + 1}:`, contact.name, "-", contact.phone);
    });
  }, [trustedContacts]);

  // Test function to verify contacts API
  const testContactsAPI = async () => {
    try {
      console.log("🧪 Testing Contacts API...");
      
      // Check if we can get permission
      const { status } = await Contacts.requestPermissionsAsync();
      console.log("🧪 Permission status:", status);
      
      if (status === "granted") {
        // Try to get contacts (just a few for testing)
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
          pageSize: 3,
        });
        console.log("🧪 Sample contacts from device:", data);
      }
    } catch (error) {
      console.error("🧪 Contacts API test failed:", error);
    }
  };

  // Run test on component mount (only in development)
  useEffect(() => {
    if (__DEV__) {
      testContactsAPI();
    }
  }, []);

  const loadTrustedContacts = async () => {
    try {
      console.log("💾 Loading trusted contacts from storage...");
      const storedContacts = await AsyncStorage.getItem(TRUSTED_CONTACTS_KEY);
      console.log("💾 Raw stored data:", storedContacts);
      
      if (storedContacts) {
        const parsedContacts = JSON.parse(storedContacts);
        console.log("💾 Parsed contacts:", parsedContacts);
        setTrustedContacts(parsedContacts);
        console.log("✅ Loaded", parsedContacts.length, "contacts from storage");
      } else {
        console.log("💾 No stored contacts found, starting with empty array");
        setTrustedContacts([]);
      }
    } catch (error) {
      console.error("❌ Error loading trusted contacts:", error);
      setTrustedContacts([]); // Fallback to empty array
    } finally {
      setLoading(false);
      console.log("💾 Loading complete, setting loading to false");
    }
  };

  const saveTrustedContacts = async (contacts) => {
    try {
      console.log("💾 Saving", contacts.length, "contacts to storage...");
      await AsyncStorage.setItem(TRUSTED_CONTACTS_KEY, JSON.stringify(contacts));
      console.log("✅ Contacts saved successfully");
      
      // Verify the save by reading it back
      const verification = await AsyncStorage.getItem(TRUSTED_CONTACTS_KEY);
      console.log("🔍 Verification - saved data:", verification);
    } catch (error) {
      console.error("❌ Error saving trusted contacts:", error);
      throw error; // Re-throw to handle in calling function
    }
  };

  const handleAddContact = async () => {
    // Show options for adding contact
    Alert.alert(
      "Add Trusted Contact",
      "How would you like to add a contact?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "From Contacts", onPress: handlePickFromContacts },
        { text: "Add Manually", onPress: handleAddManually },
      ]
    );
  };

  const handlePickFromContacts = async () => {
    try {
      console.log("🔍 Starting contact picker process...");
      
      // Request contacts permission
      const { status } = await Contacts.requestPermissionsAsync();
      console.log("📱 Contacts permission status:", status);
      
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant contacts permission to add trusted contacts.",
          [{ text: "OK" }]
        );
        return;
      }

      // Present contact picker
      console.log("📱 Opening contact picker...");
      const result = await Contacts.presentContactPickerAsync({
        allowsEditing: false,
        allowsMultipleSelection: false,
      });

      console.log("📱 Contact picker result:", result);

      // Check for both cancelled and canceled (API inconsistency)
      if (result.cancelled || result.canceled) {
        console.log("📱 Contact picker was cancelled");
        return;
      }

      // The contact data is directly in result, not result.contact
      if (!result || result.contactType === "cancel" || !result.id) {
        console.log("📱 No contact received from picker");
        Alert.alert(
          "No Contact Selected",
          "Please select a contact to add to your trusted contacts.",
          [{ text: "OK" }]
        );
        return;
      }

      const contact = result; // Contact data is directly in result
      console.log("📱 Selected contact:", contact);
      
      // Check if contact already exists
      const existingContact = trustedContacts.find(
        (tc) => tc.contactId === contact.id
      );
      
      if (existingContact) {
        Alert.alert(
          "Contact Already Added",
          `${contact.name || contact.firstName || "This contact"} is already in your trusted contacts.`,
          [{ text: "OK" }]
        );
        return;
      }

      // Get the primary phone number with better handling
      let phoneNumber = "No phone number";
      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        phoneNumber = contact.phoneNumbers[0].number || contact.phoneNumbers[0].digits || "No phone number";
      }

      // Handle name with fallback options
      const contactName = contact.name || 
                         contact.firstName || 
                         (contact.firstName && contact.lastName ? `${contact.firstName} ${contact.lastName}` : null) ||
                         "Unknown Contact";

      // Create new trusted contact
      const newTrustedContact = {
        id: Date.now(), // Simple ID generation
        contactId: contact.id || `temp_${Date.now()}`,
        name: contactName,
        phone: phoneNumber,
        relationship: "Friend", // Default relationship
        isEmergencyContact: false,
      };

      console.log("📱 Creating new trusted contact:", newTrustedContact);

      // Add to list
      const updatedContacts = [...trustedContacts, newTrustedContact];
      console.log("📱 Updated contacts list:", updatedContacts);
      
      setTrustedContacts(updatedContacts);
      await saveTrustedContacts(updatedContacts);

      console.log("✅ Contact added successfully");
      
      Alert.alert(
        "Contact Added",
        `${contactName} has been added to your trusted contacts.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("❌ Error adding contact:", error);
      Alert.alert(
        "Error",
        `Failed to add contact: ${error.message || "Unknown error"}. Please try again.`,
        [{ text: "OK" }]
      );
    }
  };

  const handleAddManually = () => {
    // For now, just show an alert - you could implement a form here
    Alert.prompt(
      "Add Contact Manually",
      "Enter contact name:",
      (name) => {
        if (name && name.trim()) {
          Alert.prompt(
            "Add Contact Manually", 
            "Enter phone number:",
            (phone) => {
              if (phone && phone.trim()) {
                addManualContact(name.trim(), phone.trim());
              }
            },
            "plain-text",
            "",
            "phone-pad"
          );
        }
      }
    );
  };

  const addManualContact = async (name, phone) => {
    try {
      const newTrustedContact = {
        id: Date.now(),
        contactId: `manual_${Date.now()}`,
        name: name,
        phone: phone,
        relationship: "Friend",
        isEmergencyContact: false,
      };

      const updatedContacts = [...trustedContacts, newTrustedContact];
      setTrustedContacts(updatedContacts);
      await saveTrustedContacts(updatedContacts);

      Alert.alert(
        "Contact Added",
        `${name} has been added to your trusted contacts.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error adding manual contact:", error);
      Alert.alert("Error", "Failed to add contact. Please try again.");
    }
  };

  const handleContactPress = (contact) => {
    // Contact press now does nothing - all actions are through specific buttons
    return;
  };

  const handleCallContact = async (contact) => {
    try {
      // Clean the phone number - remove any non-numeric characters except + and spaces
      const cleanPhone = contact.phone.replace(/[^\d+\s()-]/g, '');
      const phoneUrl = `tel:${cleanPhone}`;
      
      // Check if the device can handle phone calls
      const canCall = await Linking.canOpenURL(phoneUrl);
      
      if (canCall) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(
          "Cannot Make Call", 
          "Your device cannot make phone calls or the phone number is invalid.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Error making phone call:', error);
      Alert.alert(
        "Call Failed",
        "Failed to initiate the phone call. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleEditRelationship = (contact) => {
    const relationships = ["Friend", "Family", "Partner", "Colleague", "Neighbor", "Other"];
    
    Alert.alert(
      "Edit Relationship",
      `Select relationship for ${contact.name}:`,
      [
        { text: "Cancel", style: "cancel" },
        ...relationships.map(relationship => ({
          text: relationship,
          onPress: () => updateContactRelationship(contact.id, relationship)
        }))
      ]
    );
  };

  const updateContactRelationship = async (contactId, newRelationship) => {
    const updatedContacts = trustedContacts.map(contact =>
      contact.id === contactId
        ? { ...contact, relationship: newRelationship }
        : contact
    );
    
    setTrustedContacts(updatedContacts);
    await saveTrustedContacts(updatedContacts);
  };

  const handleRemoveContact = (contact) => {
    Alert.alert(
      "Remove Contact",
      `Are you sure you want to remove ${contact.name} from your trusted contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            const updatedContacts = trustedContacts.filter(tc => tc.id !== contact.id);
            setTrustedContacts(updatedContacts);
            await saveTrustedContacts(updatedContacts);
          }
        },
      ]
    );
  };

  const handleSendAlert = async (contact) => {
    try {
      // Get current location
      const location = await getCurrentLocation();
      if (!location) return;

      const { latitude, longitude } = location.coords;
      const locationUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
      
      // Prepare message
      const message = `Need Help please reach my location: ${locationUrl}`;
      
      // Check if contact has valid phone number
      if (!contact.phone || contact.phone === "No phone number") {
        Alert.alert('No Phone Number', `${contact.name} doesn't have a valid phone number.`);
        return;
      }

      // Check if SMS is available
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('SMS Not Available', 'SMS messaging is not available on this device.');
        return;
      }

      // Send SMS
      await SMS.sendSMSAsync([contact.phone], message);
      
      // Show success message
      Alert.alert('Alert Sent', `Emergency alert sent to ${contact.name}.`);

    } catch (error) {
      console.error('Error sending alert:', error);
      Alert.alert('Send Failed', 'Failed to send emergency alert. Please try again.');
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to send your location.');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      return location;
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your current location.');
      return null;
    }
  };

  // Send check-in to all starred contacts
  const sendCheckIn = async () => {
    try {
      // Get starred contacts (emergency contacts)
      const starredContacts = trustedContacts.filter(contact => contact.isEmergencyContact);
      
      if (starredContacts.length === 0) {
        Alert.alert('No Emergency Contacts', 'Please mark some contacts as emergency contacts (star them) to send check-ins.');
        return;
      }

      // Get current location
      const location = await getCurrentLocation();
      if (!location) return;

      const { latitude, longitude } = location.coords;
      const locationUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
      
      // Prepare message
      const message = `Hey, I have reached safely. My current location: ${locationUrl}`;
      
      // Get phone numbers
      const phoneNumbers = starredContacts
        .map(contact => contact.phone)
        .filter(phone => phone && phone !== "No phone number");

      if (phoneNumbers.length === 0) {
        Alert.alert('No Phone Numbers', 'Emergency contacts need valid phone numbers to receive messages.');
        return;
      }

      // Check if SMS is available
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('SMS Not Available', 'SMS messaging is not available on this device.');
        return;
      }

      // Send SMS
      await SMS.sendSMSAsync(phoneNumbers, message);
      
      // Show success message
      Alert.alert(
        'Check-in Sent', 
        `Check-in message sent to ${starredContacts.length} emergency contact(s).`
      );

    } catch (error) {
      console.error('Error sending check-in:', error);
      Alert.alert('Send Failed', 'Failed to send check-in message. Please try again.');
    }
  };

  // Send alert to all starred contacts
  const sendAlert = async () => {
    try {
      // Get starred contacts (emergency contacts)
      const starredContacts = trustedContacts.filter(contact => contact.isEmergencyContact);
      
      if (starredContacts.length === 0) {
        Alert.alert('No Emergency Contacts', 'Please mark some contacts as emergency contacts (star them) to send alerts.');
        return;
      }

      // Get current location
      const location = await getCurrentLocation();
      if (!location) return;

      const { latitude, longitude } = location.coords;
      const locationUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
      
      // Prepare message
      const message = `Need Help please reach my location: ${locationUrl}`;
      
      // Get phone numbers
      const phoneNumbers = starredContacts
        .map(contact => contact.phone)
        .filter(phone => phone && phone !== "No phone number");

      if (phoneNumbers.length === 0) {
        Alert.alert('No Phone Numbers', 'Emergency contacts need valid phone numbers to receive messages.');
        return;
      }

      // Check if SMS is available
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('SMS Not Available', 'SMS messaging is not available on this device.');
        return;
      }

      // Send SMS
      await SMS.sendSMSAsync(phoneNumbers, message);
      
      // Show success message
      Alert.alert(
        'Alert Sent', 
        `Emergency alert sent to ${starredContacts.length} contact(s).`
      );

    } catch (error) {
      console.error('Error sending alert:', error);
      Alert.alert('Send Failed', 'Failed to send emergency alert. Please try again.');
    }
  };

  const toggleEmergencyContact = async (contactId) => {
    const updatedContacts = trustedContacts.map((contact) =>
      contact.id === contactId
        ? { ...contact, isEmergencyContact: !contact.isEmergencyContact }
        : contact
    );
    
    setTrustedContacts(updatedContacts);
    await saveTrustedContacts(updatedContacts);
  };

  const filteredContacts = trustedContacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.relationship.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color={COLORS.slateGray} />
      <Text style={styles.emptyStateTitle}>No Trusted Contacts</Text>
      <Text style={styles.emptyStateText}>
        Add trusted contacts who can receive your safety alerts and check-ins.
      </Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={handleAddContact}>
        <Ionicons name="add" size={20} color={COLORS.white} />
        <Text style={styles.emptyStateButtonText}>Add Your First Contact</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNoResultsState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color={COLORS.slateGray} />
      <Text style={styles.emptyStateTitle}>No Results Found</Text>
      <Text style={styles.emptyStateText}>
        Try adjusting your search or add a new contact.
      </Text>
    </View>
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

        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => handleCallContact(item)}
        >
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
      {trustedContacts.length > 0 && (
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
      )}

      {/* Contacts List */}
      {loading ? (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : trustedContacts.length === 0 ? (
        renderEmptyState()
      ) : filteredContacts.length === 0 && searchQuery.length > 0 ? (
        renderNoResultsState()
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.contactsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Quick Actions - only show if there are contacts */}
      {trustedContacts.length > 0 && (
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={sendCheckIn}
          >
            <Ionicons name="notifications" size={20} color={COLORS.white} />
            <Text style={styles.quickActionText}>Send Check-in</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, styles.alertButton]}
            onPress={sendAlert}
          >
            <Ionicons name="warning" size={20} color={COLORS.white} />
            <Text style={styles.quickActionText}>Send Alert</Text>
          </TouchableOpacity>
        </View>
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
  // Loading and Empty States
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  emptyStateTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.deepNavy,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyStateText: {
    fontSize: FONTS.sizes.medium,
    color: COLORS.slateGray,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.mutedTeal,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyStateButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.medium,
    fontWeight: FONTS.weights.semibold,
    marginLeft: SPACING.sm,
  },
});
