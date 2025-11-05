"use client"
import { API_BASE_URL } from "@env";
import { useState, useEffect, useRef } from "react"
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, Alert, ActivityIndicator } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'
import RNPickerSelect from 'react-native-picker-select'

const UserProfile = () => {
  const router = useRouter();

  // --- State Management ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState({ address: {} });
  const [editedUserData, setEditedUserData] = useState({});
  const [editedAddress, setEditedAddress] = useState({});

  // State for dropdown options
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // 📦 Orders
  const [orderHistory, setOrderHistory] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);


  // --- Data Fetching and Initialization ---

  // 1. Get UserID on mount, then trigger data fetching.
  useEffect(() => {
    const getAndFetchUser = async () => {
      setLoading(true);
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
          await fetchUserData(storedUserId);
        } else {
          Alert.alert("Error", "Please login first", [{ text: "OK", onPress: () => router.push("/Login") }]);
        }
      } catch (error) {
        console.error("Initialization Error:", error);
      } finally {
        setLoading(false);
      }
    };
    getAndFetchUser();
  }, []);

  // 2. Fetch all necessary data for the component.
  const fetchUserData = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error("Authentication token not found.");

      const response = await fetch(`${API_BASE_URL}/api/singleusers/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch user data.");

      // Set both view and edit states
      setUserData(data.UserData);
      setEditedUserData(data.UserData);

      // KEY FIX: If an address exists, pre-load the dropdowns for it.
      if (data.UserData.address?.provinceCode) {
        setEditedAddress(data.UserData.address);
        // Proactively fetch cities and barangays for the saved address
        await fetchCities(data.UserData.address.provinceCode, data.UserData.address.provinceName);
        if (data.UserData.address.cityCode) {
          await fetchBarangays(data.UserData.address.cityCode);
        }
      }
      // Also fetch the list of available provinces for the dropdown.
      await fetchProvinces();

      // 🔽 ALSO fetch order history once user data is ready
      await fetchOrders();

    } catch (error) {
      console.error("Error fetching user data:", error);
      Alert.alert("Error", error.message);
    }
  };

  // 3. PSGC Data Fetching Functions
  const fetchProvinces = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/psgc/provinces`);
      const data = await res.json();
      setProvinces(data.map(p => ({ label: p.name, value: p.code, key: p.code })));
    } catch (err) { console.error('Failed to fetch provinces:', err); }
  };

  const fetchCities = async (provinceCode, provinceName) => {
    if (!provinceCode) return;
    try {
      const endpoint = provinceName === 'Metro Manila'
        ? `/api/psgc/regions/130000000/cities`
        : `/api/psgc/provinces/${provinceCode}/cities`;
      const res = await fetch(`${API_BASE_URL}${endpoint}`);
      const data = await res.json();
      setCities(data.map(c => ({ label: c.name, value: c.code, key: c.code })));
    } catch (err) { console.error('Failed to fetch cities:', err); }
  };

  const fetchBarangays = async (cityCode) => {
    if (!cityCode) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/psgc/cities/${cityCode}/barangays`);
      const data = await res.json();
      setBarangays(data.map(b => ({ label: b.name, value: b.code, key: b.code })));
    } catch (err) { console.error('Failed to fetch barangays:', err); }
  };

  // 🧾 Fetch order history for the logged-in user
  const fetchOrders = async () => {
    try {
      setOrderLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${API_BASE_URL}/api/user/orders`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch orders');
      setOrderHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Order history fetch error:', err.message);
    } finally {
      setOrderLoading(false);
    }
  };

  // --- State Update Handlers ---

  const handleAddressChange = (field, value) => {
    setEditedAddress(prev => {
      const newState = { ...prev, [field]: value };
      // Find and set the name for the selected code
      if (field.endsWith('Code')) {
        const nameField = field.replace('Code', 'Name');
        let sourceArray = [];
        if (field === 'provinceCode') sourceArray = provinces;
        else if (field === 'cityCode') sourceArray = cities;
        else if (field === 'brgyCode') sourceArray = barangays;

        const match = sourceArray.find(item => item.value === value);
        newState[nameField] = match ? match.label : '';
      }
      // Reset dependent fields
      if (field === 'provinceCode') {
        newState.cityCode = ''; newState.cityName = '';
        newState.brgyCode = ''; newState.brgyName = '';
        setCities([]); setBarangays([]);
        if (value) fetchCities(value, newState.provinceName);
      }
      if (field === 'cityCode') {
        newState.brgyCode = ''; newState.brgyName = '';
        setBarangays([]);
        if (value) fetchBarangays(value);
      }
      return newState;
    });
  };

  const handleSaveAddress = async () => {
    // Simple validation
    const required = ['fullName', 'addressLine1', 'provinceCode', 'cityCode', 'brgyCode', 'postalCode'];
    if (required.some(field => !editedAddress[field])) {
      Alert.alert("Incomplete Address", "Please fill out all required address fields.");
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/user/address`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...editedAddress }), // phone is now part of editedAddress
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update address.");

      await fetchUserData(userId); // Refresh all user data
      setIsEditingAddress(false);
      Alert.alert("Success", "Address updated successfully.");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- JSX Render Methods ---

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      {/* ... Your personal info section (name, email, phone) can remain the same ... */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        {/* ... existing personal info display and edit logic ... */}
      </View>

      {/* Address Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Address Information</Text>
          {!isEditingAddress && (
            <TouchableOpacity onPress={() => {
              // Include phone in the editable address state so it can be modified
              setEditedAddress({ ...(userData.address || {}), phone: userData.phone || '' });
              setIsEditingAddress(true);
            }}>
              <Icon name="edit" size={20} color="#2563EB" />
            </TouchableOpacity>
          )}
        </View>

        {isEditingAddress ? (
          // --- EDITING VIEW for Address ---
          <>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone *</Text>
              <TextInput
                style={styles.infoInput}
                value={editedAddress.phone}
                onChangeText={v => handleAddressChange('phone', v)}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Full Name *</Text>
              <TextInput style={styles.infoInput} value={editedAddress.fullName} onChangeText={v => handleAddressChange('fullName', v)} />
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Address Line 1 *</Text>
              <TextInput style={styles.infoInput} value={editedAddress.addressLine1} onChangeText={v => handleAddressChange('addressLine1', v)} placeholder="House No., Street" />
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Address Line 2 (Optional)</Text>
              <TextInput style={styles.infoInput} value={editedAddress.addressLine2} onChangeText={v => handleAddressChange('addressLine2', v)} placeholder="Building, Subdivision" />
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Province *</Text>
              <RNPickerSelect
                onValueChange={(value) => handleAddressChange('provinceCode', value)}
                items={provinces}
                value={editedAddress.provinceCode}
                style={pickerSelectStyles}
                useNativeAndroidPickerStyle={false}
                placeholder={{ label: 'Select a province...', value: null }}
                Icon={() => <Icon name="keyboard-arrow-down" size={24} color="gray" />}
              />
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>City / Municipality *</Text>
              <RNPickerSelect
                onValueChange={(value) => handleAddressChange('cityCode', value)}
                items={cities}
                value={editedAddress.cityCode}
                disabled={!editedAddress.provinceCode || cities.length === 0}
                style={pickerSelectStyles}
                useNativeAndroidPickerStyle={false}
                placeholder={{ label: 'Select a city...', value: null }}
                Icon={() => <Icon name="keyboard-arrow-down" size={24} color="gray" />}
              />
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Barangay *</Text>
              <RNPickerSelect
                onValueChange={(value) => handleAddressChange('brgyCode', value)}
                items={barangays}
                value={editedAddress.brgyCode}
                disabled={!editedAddress.cityCode || barangays.length === 0}
                style={pickerSelectStyles}
                useNativeAndroidPickerStyle={false}
                placeholder={{ label: 'Select a barangay...', value: null }}
                Icon={() => <Icon name="keyboard-arrow-down" size={24} color="gray" />}
              />
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Postal Code *</Text>
              <TextInput style={styles.infoInput} value={editedAddress.postalCode} onChangeText={v => handleAddressChange('postalCode', v)} keyboardType="number-pad" />
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditingAddress(false)} disabled={saving}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveAddress} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveButtonText}>Save Address</Text>}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // --- DISPLAY VIEW for Address ---
          <>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{userData.address?.fullName || "Not set"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{userData.phone || 'Not set'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>
                {[
                  userData.address?.addressLine1,
                  userData.address?.addressLine2,
                  userData.address?.brgyName,
                  userData.address?.cityName,
                  userData.address?.provinceName,
                  userData.address?.postalCode
                ].filter(Boolean).join(', ') || 'Not set'}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* 🧾 Order History Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Order History</Text>
        </View>
        {orderLoading ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : orderHistory.length === 0 ? (
          <Text style={styles.emptyText}>You have no orders yet.</Text>
        ) : (
          orderHistory.map(order => (
            <TouchableOpacity
              key={order._id}
              style={styles.orderCard}
              onPress={() => router.push({ pathname: 'OrderDetail', params: { orderId: order._id } })}
            >
              <View style={styles.orderInfoLeft}>
                <Text style={styles.orderId}>#{order._id.slice(-6).toUpperCase()}</Text>
                <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.orderInfoRight}>
                <Text style={[styles.orderStatus, { color: getStatusColor(order.status) }]}>{order.status?.toUpperCase()}</Text>
                <Text style={styles.orderAmount}>₱{order.amount?.toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );

  // Main component render
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading Profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderProfileTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles ---

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16, paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1,
    borderColor: '#D1D5DB', borderRadius: 8, color: 'black', paddingRight: 30,
    backgroundColor: '#F9FAFB', height: 48,
  },
  inputAndroid: {
    fontSize: 16, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1,
    borderColor: '#D1D5DB', borderRadius: 8, color: 'black', paddingRight: 30,
    backgroundColor: '#F9FAFB', height: 48,
  },
  placeholder: { color: '#A1A1AA' },
  iconContainer: { top: 12, right: 10 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16, color: "#6B7280" },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: "#FFFFFF", borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    flex: 1, fontSize: 20, fontWeight: "bold",
    color: "#1F2937", textAlign: "center",
  },
  tabContent: { padding: 16 },
  section: {
    backgroundColor: "#FFFFFF", borderRadius: 12,
    padding: 16, marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937" },
  infoItem: { marginBottom: 16 },
  infoLabel: {
    fontSize: 14, color: "#6B7280",
    marginBottom: 4, fontWeight: "500",
  },
  infoValue: { fontSize: 16, color: "#1F2937" },
  infoInput: {
    fontSize: 16, color: "#1F2937", borderWidth: 1,
    borderColor: "#D1D5DB", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#F9FAFB",
  },
  actionButtons: {
    flexDirection: "row", justifyContent: "flex-end",
    marginTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, marginRight: 8, backgroundColor: '#E5E7EB'
  },
  cancelButtonText: { color: "#4B5563", fontWeight: "600" },
  saveButton: {
    backgroundColor: "#2563EB", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, minWidth: 80, alignItems: "center",
  },
  saveButtonText: { color: "#FFFFFF", fontWeight: "600" },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  orderCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  orderInfoLeft: {},
  orderId: { fontWeight: '600', color: '#1F2937' },
  orderDate: { fontSize: 12, color: '#6B7280' },
  orderInfoRight: { alignItems: 'flex-end' },
  orderStatus: { fontSize: 12, fontWeight: '600' },
  orderAmount: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
});

// After styles object, add helper function for status color
const getStatusColor = (status = '') => {
  switch (status.toLowerCase()) {
    case 'delivered':
      return '#10B981';
    case 'On Process':
    case 'Requesting for Refund':
      return '#2563EB';
    case 'Refunded':
      return '#F59E0B';
    case 'cancelled':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

export default UserProfile;