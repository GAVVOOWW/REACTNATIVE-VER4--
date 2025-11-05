"use client"

import { useState, useEffect, useRef } from "react"
import { API_BASE_URL } from "@env";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, Alert, Linking, ActivityIndicator, AppState, Platform, Modal, FlatList, Image } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useLocalSearchParams, useRouter } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNPickerSelect from 'react-native-picker-select';
import DateTimePicker from '@react-native-community/datetimepicker'

const Checkout = () => {
    const router = useRouter();
    const params = useLocalSearchParams();

    // --- State and Constants ---
    // Safely parse navigation params with fallbacks to prevent crashes
    const items = params.items ? JSON.parse(params.items) : [];
    const summary = params.summary ? JSON.parse(params.summary) : { subtotal: 0, total: 0, shipping: 0, tax: 0 };

    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const appState = useRef(AppState.currentState);
    const [deliveryMethod, setDeliveryMethod] = useState('delivery'); // 'delivery' or 'pickup'
    const [shippingFee, setShippingFee] = useState(summary.shipping || 0);
    const [scheduledDate, setScheduledDate] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [paymentType, setPaymentType] = useState('full_payment');

    // --- NEW: AI Recommendations State ---
    const [aiRecommendations, setAiRecommendations] = useState([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(false);
    const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);

    // --- ⬇️ IMPORTANT: UPDATE THIS IP ADDRESS ⬇️ ---
    // On Mac: System Settings > Wi-Fi > Details (i)
    // On Windows: Open cmd and type 'ipconfig'

    // --- Form State ---
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [barangays, setBarangays] = useState([]);

    const [shippingInfo, setShippingInfo] = useState({
        fullName: "", email: "", phone: "", addressLine1: "",
        provinceCode: "", provinceName: "", cityCode: "", cityName: "",
        brgyCode: "", brgyName: "", postalCode: "",
    });

    const [paymentInfo, setPaymentInfo] = useState({
        cardNumber: "", expiryDate: "", cvv: "", cardholderName: "", billingAddressSame: true,
    });

    const [selectedShipping, setSelectedShipping] = useState("standard");
    const [selectedPayment, setSelectedPayment] = useState("card");

    // Static data for shipping and payment options
    const shippingOptions = [
        { id: "standard", name: "Standard Shipping", description: "5-7 business days", price: 50, originalPrice: 100 },
        { id: "express", name: "Express Shipping", description: "2-3 business days", price: 150 },
    ];
    const paymentMethods = [
        { id: "card", name: "Credit/Debit Card", icon: "credit-card" },
        { id: "gcash", name: "GCash", icon: "account-balance-wallet" },
    ];

    // --- Logic Hooks ---

    // Helper function to check if cart has customized items
    const hasCustomizedItems = () => {
        console.log("🔍 [hasCustomizedItems] Checking if cart has customized items")
        console.log("📝 Selected items:", items)

        const hasCustomized = items.some(entry => {
            const isCustomized = entry.item?.is_customizable || false
            console.log(`📋 Item ${entry.item?.name}: is_customizable = ${isCustomized}`)
            return isCustomized
        })

        console.log("✅ Cart has customized items:", hasCustomized)
        return hasCustomized
    }

    // Helper function to calculate payment amounts for mixed cart
    const calculatePaymentAmounts = () => {
        console.log("💰 [calculatePaymentAmounts] Calculating payment amounts for cart")
        console.log("📋 Selected items:", items)

        let customizedTotal = 0
        let normalTotal = 0

        items.forEach(entry => {
            // Use customPrice if available, otherwise fall back to the item's default price
            const price = entry.customPrice ?? entry.item?.price ?? 0;
            const itemTotal = price * entry.quantity;
            const isCustomized = entry.item?.is_customizable || false

            console.log(`📦 Item: ${entry.item?.name}`)
            console.log(`💵 Price: ₱${price}, Quantity: ${entry.quantity}, Total: ₱${itemTotal}`)
            console.log(`🔧 Is Customized: ${isCustomized}`)

            if (isCustomized) {
                customizedTotal += itemTotal
                console.log(`➕ Added to customized total: ₱${itemTotal}`)
            } else {
                normalTotal += itemTotal
                console.log(`➕ Added to normal total: ₱${itemTotal}`)
            }
        })

        // Down payment = (customized total * 30%) + normal items total
        const downPaymentAmount = (customizedTotal * 0.3) + normalTotal
        // Remaining balance = customized total * 70%
        const remainingBalance = customizedTotal * 0.7
        const fullAmount = customizedTotal + normalTotal

        console.log("📊 Payment Calculation Results:")
        console.log(`🔧 Customized Items Total: ₱${customizedTotal.toFixed(2)}`)
        console.log(`📦 Normal Items Total: ₱${normalTotal.toFixed(2)}`)
        console.log(`💳 Down Payment Amount: ₱${downPaymentAmount.toFixed(2)}`)
        console.log(`💰 Remaining Balance: ₱${remainingBalance.toFixed(2)}`)
        console.log(`💸 Full Amount: ₱${fullAmount.toFixed(2)}`)

        return { customizedTotal, normalTotal, downPaymentAmount, remainingBalance, fullAmount }
    }

    // Calculate the actual amount to be charged for the current payment
    const getActualPaymentAmount = () => {
        if (hasCustomizedItems() && paymentType === "down_payment") {
            // For down payment: charge 30% of customized items + full price of normal items
            let actualAmount = 0
            items.forEach(entry => {
                // Use customPrice if available, otherwise fall back to the item's default price
                const price = entry.customPrice ?? entry.item?.price ?? 0;
                const itemTotal = price * entry.quantity;
                const isCustomized = entry.item?.is_customizable || false

                if (isCustomized) {
                    actualAmount += itemTotal * 0.3 // 30% of customized items
                } else {
                    actualAmount += itemTotal // Full price of normal items
                }
            })
            return actualAmount
        } else {
            // For full payment: charge full price of all items
            return baseSubtotal
        }
    }

    // AppState Polling for automatic payment confirmation
    useEffect(() => {
        const handleAppStateChange = async (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                const orderId = await AsyncStorage.getItem('currentOrderId');
                if (orderId) {
                    try {
                        const token = await AsyncStorage.getItem('token');
                        const res = await fetch(`${API_BASE_URL}/api/order/${orderId}/status`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.ok) {
                            const orderDetails = await res.json();
                            if (orderDetails.paymentStatus === 'Downpayment Received' || orderDetails.paymentStatus === 'Fully Paid') {
                                // 🧹 Post-payment cleanup: remove items from cart & decrease stock
                                try {
                                    const userId = await AsyncStorage.getItem('userId');
                                    if (userId && Array.isArray(items) && items.length > 0) {
                                        // 1️⃣ Remove purchased items from the cart (one request per item)
                                        for (const entry of items) {
                                            await fetch(`${API_BASE_URL}/api/cart/${userId}/item/${entry.item._id}`, {
                                                method: 'DELETE',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                            });
                                        }

                                        // 2️⃣ Decrease stock for each purchased item (single batched request)
                                        await fetch(`${API_BASE_URL}/api/items/decrease-stock`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify({
                                                items: items.map(entry => ({
                                                    itemId: entry.item._id,
                                                    quantity: entry.quantity,
                                                }))
                                            })
                                        });
                                    }
                                } catch (cleanupErr) {
                                    console.error('Post-payment cleanup failed:', cleanupErr);
                                }

                                await AsyncStorage.removeItem('currentOrderId');
                                router.replace({ pathname: 'SuccessPage', params: { orderId } });
                            }
                        }
                    } catch (error) {
                        console.error('Error checking order status:', error);
                    }
                }
            }
            appState.current = nextAppState;
        };
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [router]);

    // --- ⬇️ CORRECTED GEOLOCATION DATA FETCHING LOGIC ⬇️ ---

    // 1. Fetch Provinces on initial component mount
    useEffect(() => {
        const getProvinces = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/psgc/provinces`);
                if (!res.ok) throw new Error(`Server Error: ${res.status}`);
                const data = await res.json();
                const mapped = data.map(p => ({ label: p.name, value: p.code, key: p.code }));
                setProvinces(mapped);
            } catch (error) {
                Alert.alert("Network Error", `Could not fetch provinces. Please ensure your backend server is running at ${API_BASE_URL} and your phone is on the same Wi-Fi network.`);
                console.error("Fetch Provinces Failed:", error);
            }
        };
        getProvinces();
    }, []);

    // 🚀 Prefill Shipping Information from saved user profile
    useEffect(() => {
        const preloadAddress = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                const userId = await AsyncStorage.getItem('userId');
                if (!token || !userId) return;

                const res = await fetch(`${API_BASE_URL}/api/singleusers/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (!res.ok || !data.success) return;

                const u = data.UserData || {};
                const a = u.address || {};

                setShippingInfo(prev => ({
                    ...prev,
                    fullName: a.fullName || u.name || '',
                    email: u.email || '',
                    phone: u.phone || '',
                    addressLine1: a.addressLine1 || '',
                    provinceCode: a.provinceCode || '',
                    provinceName: a.provinceName || '',
                    cityCode: a.cityCode || '',
                    cityName: a.cityName || '',
                    brgyCode: a.brgyCode || '',
                    brgyName: a.brgyName || '',
                    postalCode: a.postalCode || '',
                }));
            } catch (err) {
                console.log('Prefill address failed:', err.message);
            }
        };

        preloadAddress();
    }, []);

    // 2. Fetch Cities when a Province is selected
    useEffect(() => {
        if (!shippingInfo.provinceCode) {
            setCities([]);
            setBarangays([]);
            return;
        }

        const getCities = async () => {
            try {
                // Metro Manila is represented by region code 130000000
                const isMetroManila = shippingInfo.provinceCode === '130000000' || shippingInfo.provinceName === 'Metro Manila';
                const endpoint = isMetroManila
                    ? `${API_BASE_URL}/api/psgc/regions/130000000/cities`
                    : `${API_BASE_URL}/api/psgc/provinces/${shippingInfo.provinceCode}/cities`;

                const res = await fetch(endpoint);
                if (!res.ok) throw new Error(`Server Error: ${res.status}`);
                const data = await res.json();
                const mapped = data.map(c => ({ label: c.name, value: c.code, key: c.code }));
                setCities(mapped);
            } catch (error) {
                console.error('Fetch Cities Failed:', error);
            }
        };

        getCities();
    }, [shippingInfo.provinceCode]);

    // Auto-update shipping fee whenever province name changes
    useEffect(() => {
        if (deliveryMethod === 'pickup') {
            setShippingFee(0)
            return
        }
        if (shippingInfo.provinceName === 'Rizal') {
            setShippingFee(1000)
        } else if (shippingInfo.provinceName === 'Metro Manila') {
            setShippingFee(1500)
        } else {
            setShippingFee(0) // default or other provinces
        }
    }, [shippingInfo.provinceName, deliveryMethod])

    // 3. Fetch Barangays when a City is selected
    useEffect(() => {
        if (!shippingInfo.cityCode) {
            setBarangays([]);
            return;
        }
        const getBarangays = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/psgc/cities/${shippingInfo.cityCode}/barangays`);
                if (!res.ok) throw new Error(`Server Error: ${res.status}`);
                const data = await res.json();
                const mapped = data.map(b => ({ label: b.name, value: b.code, key: b.code }));
                setBarangays(mapped);
            } catch (error) {
                console.error("Fetch Barangays Failed:", error);
            }
        };
        getBarangays();
    }, [shippingInfo.cityCode]);

    // 🔄 Fill provinceName once provinces list arrives
    useEffect(() => {
        if (shippingInfo.provinceCode && !shippingInfo.provinceName && provinces.length > 0) {
            const match = provinces.find(p => p.value === shippingInfo.provinceCode);
            if (match) setShippingInfo(prev => ({ ...prev, provinceName: match.label }));
        }
    }, [provinces, shippingInfo.provinceCode, shippingInfo.provinceName]);

    // 🔄 Fill cityName once cities list arrives
    useEffect(() => {
        if (shippingInfo.cityCode && !shippingInfo.cityName && cities.length > 0) {
            const match = cities.find(c => c.value === shippingInfo.cityCode);
            if (match) setShippingInfo(prev => ({ ...prev, cityName: match.label }));
        }
    }, [cities, shippingInfo.cityCode, shippingInfo.cityName]);

    // 🔄 Fill brgyName once barangay list arrives
    useEffect(() => {
        if (shippingInfo.brgyCode && !shippingInfo.brgyName && barangays.length > 0) {
            const match = barangays.find(b => b.value === shippingInfo.brgyCode);
            if (match) setShippingInfo(prev => ({ ...prev, brgyName: match.label }));
        }
    }, [barangays, shippingInfo.brgyCode, shippingInfo.brgyName]);

    // --- NEW: Fetch AI Recommendations ---
    useEffect(() => {
        const fetchAiRecommendations = async () => {
            // Only fetch if there are items in the cart
            if (items.length === 0) {
                console.log("[FRONTEND-REC]: Cart is empty, not fetching recommendations.");
                return;
            }

            console.log("[FRONTEND-REC]: Starting to fetch AI recommendations for checkout.");
            setIsLoadingRecs(true);

            try {
                // Extract the IDs of the items in the cart
                const selectedIds = items.map(entry => entry.item._id);
                console.log("[FRONTEND-REC]: Sending these item IDs to the backend:", selectedIds);

                // Call the AI recommendation API
                const response = await fetch(`${API_BASE_URL}/api/items/recommend`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ selectedIds: selectedIds }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    console.log("[FRONTEND-REC]: Successfully received AI recommendations:", data.ItemData);
                    setAiRecommendations(data.ItemData);
                } else {
                    console.error("[FRONTEND-REC-ERROR]: Failed to fetch recommendations -", data.message);
                }
            } catch (error) {
                console.error("[FRONTEND-REC-ERROR]: Network error while fetching recommendations:", error);
            } finally {
                setIsLoadingRecs(false);
                console.log("[FRONTEND-REC]: Finished fetching AI recommendations.");
            }
        };

        fetchAiRecommendations();
    }, [params.items]); // Re-run if the items in the checkout change

    // --- Event Handlers ---

    const handleInputChange = (field, value) => {
        setShippingInfo((prev) => ({ ...prev, [field]: value }));
    };

    const handlePaymentInputChange = (field, value) => {
        setPaymentInfo((prev) => ({ ...prev, [field]: value }));
    };

    const handlePickerChange = (field, value, items) => {
        if (!value) return;
        const selectedItem = items.find(item => item.value === value);
        const nameField = field.replace('Code', 'Name');
        setShippingInfo(prev => ({
            ...prev,
            [field]: value,
            [nameField]: selectedItem ? selectedItem.label : "",
            ...(field === 'provinceCode' && { cityCode: '', cityName: '', brgyCode: '', brgyName: '' }),
            ...(field === 'cityCode' && { brgyCode: '', brgyName: '' }),
        }));
    };



    const handlePlaceOrder = async () => {
        // Validation
        if (deliveryMethod === 'delivery') {
            const requiredFields = ['phone', 'addressLine1', 'provinceName', 'cityName', 'brgyName'];
            const missing = requiredFields.filter(f => !shippingInfo[f]);
            if (missing.length > 0) {
                Alert.alert('Incomplete Address', 'Please add your shipping address first.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Edit', onPress: () => router.push({ pathname: '/UserProfile', params: { editAddress: '1' } }) }
                ]);
                return;
            }
        }

        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert("Authentication Error", "You are not logged in.");
                setIsLoading(false);
                return;
            }

            // Determine order status based on customization and delivery method
            let orderStatus;
            if (hasCustomizedItems()) {
                orderStatus = "On Process";
            } else {
                if (deliveryMethod === 'pickup') {
                    orderStatus = "Ready for Pickup";
                } else {
                    orderStatus = "On Process";
                }
            }

            console.log("🔍 Order Status Calculation:", {
                hasCustomizedItems: hasCustomizedItems(),
                deliveryMethod: deliveryMethod,
                calculatedStatus: orderStatus
            });

            // Step 1: Create the order
            const orderResponse = await fetch(`${API_BASE_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    items: items.map(item => ({
                        product: item.item._id,
                        quantity: item.quantity,
                        price: item.customPrice ?? item.item.price,
                        customH: item.customH ?? null,
                        customW: item.customW ?? null,
                        customL: item.customL ?? null,
                        legsFrameMaterial: item.legsFrameMaterial ?? null,
                        tabletopMaterial: item.tabletopMaterial ?? null
                    })),
                    scheduleDate: scheduledDate ? scheduledDate.toISOString() : null,
                    shippingFee: shippingFee,
                    deliveryOption: deliveryMethod,
                    amount: baseSubtotal,
                    totalWithShipping: baseSubtotal + shippingFee,

                    shippingAddress: {
                        address: shippingInfo.addressLine1,
                        city: shippingInfo.cityName,
                        state: shippingInfo.provinceName,
                        zipCode: shippingInfo.postalCode,
                        phone: shippingInfo.phone,
                        fullName: shippingInfo.fullName,
                    },
                    paymentType: hasCustomizedItems() ? paymentType : 'full_payment',
                    amountPaid: getActualPaymentAmount() + shippingFee,
                    balance: (hasCustomizedItems() && paymentType === 'down_payment') ? calculatePaymentAmounts().remainingBalance : 0,
                    orderStatus: orderStatus,
                })
            });

            const orderData = await orderResponse.json();

            if (!orderResponse.ok || !orderData.success) {
                throw new Error(orderData.message || 'Failed to create order');
            }


            const orderId = orderData.OrderData._id;

            // Save order ID for status checking when app returns from payment
            await AsyncStorage.setItem('currentOrderId', orderId);
            // In checkout.jsx, add this right before the API call
            const paymentAmount = getActualPaymentAmount() + shippingFee;
            console.log("🔍 Payment amount being sent to server:", paymentAmount);
            // Step 2: Create PayMongo checkout session
            const checkoutResponse = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    paymentAmount: paymentAmount,
                    items: items.map(item => ({
                        name: item.item.name,
                        price: item.customPrice ?? item.item.price,
                        quantity: item.quantity
                    })),
                    orderId: orderId,
                    shippingFee: shippingFee,
                })
            });

            const checkoutData = await checkoutResponse.json();

            if (!checkoutResponse.ok || !checkoutData.checkoutUrl) {
                throw new Error(checkoutData.error || 'Failed to create payment session');
            }

            // Step 3: Open PayMongo checkout URL in browser
            const supported = await Linking.canOpenURL(checkoutData.checkoutUrl);
            if (supported) {
                await Linking.openURL(checkoutData.checkoutUrl);
            } else {
                Alert.alert("Error", "Cannot open payment page. Please try again.");
            }

        } catch (error) {
            console.error("Order placement error:", error);
            Alert.alert("Order Failed", error.message || "An unexpected error occurred.");
            await AsyncStorage.removeItem('currentOrderId');
        } finally {
            setIsLoading(false);
        }
    };

    // ... existing code ...

    // --- JSX Render Methods ---

    const renderRecommendationsModal = () => null;

    const renderAddressSummary = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            {shippingInfo.addressLine1 ? (
                <>
                    <Text style={styles.summaryValue}>{shippingInfo.fullName}</Text>
                    <Text style={styles.summaryValue}>{shippingInfo.addressLine1}</Text>
                    {shippingInfo.addressLine2 ? <Text style={styles.summaryValue}>{shippingInfo.addressLine2}</Text> : null}
                    <Text style={styles.summaryValue}>{shippingInfo.brgyName}</Text>
                    <Text style={styles.summaryValue}>{shippingInfo.cityName}, {shippingInfo.provinceName}</Text>
                    <Text style={styles.summaryValue}>{shippingInfo.postalCode}</Text>
                    <Text style={styles.summaryValue}>Phone: {shippingInfo.phone}</Text>
                </>
            ) : (
                <Text style={styles.summaryValue}>No shipping address saved.</Text>
            )}

            <TouchableOpacity style={styles.editAddressButton} onPress={() => router.push({ pathname: '/UserProfile', params: { editAddress: '1' } })}>
                <Text style={styles.editAddressButtonText}>{shippingInfo.addressLine1 ? 'Edit Address' : 'Add Address'}</Text>
            </TouchableOpacity>
        </View>
    );

    const baseSubtotal = items.reduce((acc, entry) => {
        // Use customPrice if available, otherwise fall back to the item's default price
        const price = entry.customPrice ?? entry.item?.price ?? 0;
        return acc + price * entry.quantity;
    }, 0);

    const renderScheduleStep = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Schedule Delivery / Pick-up</Text>
            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.datePickerText}>{scheduledDate ? scheduledDate.toDateString() : 'Select Date'}</Text>
            </TouchableOpacity>
            {showDatePicker && (
                <DateTimePicker
                    value={scheduledDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date()}
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false)
                        if (event.type !== 'dismissed' && selectedDate) setScheduledDate(selectedDate)
                    }}
                />
            )}
        </View>
    )

    const renderOrderSummary = () => {
        const { downPaymentAmount, remainingBalance, customizedTotal, normalTotal } = calculatePaymentAmounts();
        const showDownPaymentOption = hasCustomizedItems();

        return (
            <View style={styles.orderSummary}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                {items.map((entry) => {
                    const price = entry.customPrice ?? entry.item?.price ?? 0;
                    return (
                        <View key={entry.item._id} style={styles.summaryItem}>
                            <Text style={styles.summaryItemName} numberOfLines={1}>{entry.item.name}</Text>
                            <Text style={styles.summaryItemDetails}>Qty: {entry.quantity}</Text>
                            <Text style={styles.summaryItemPrice}>₱{(price * entry.quantity).toLocaleString()}</Text>
                        </View>
                    );
                })}
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>₱{baseSubtotal.toLocaleString()}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Shipping</Text>
                    <Text style={styles.summaryValue}>
                        {deliveryMethod === 'pickup' ? 'For Pickup' : (shippingFee === 0 ? 'FREE' : `₱${shippingFee.toLocaleString()}`)}
                    </Text>
                </View>

                {showDownPaymentOption && (
                    <>
                        <View style={styles.paymentOptionContainer}>
                            <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentType('full_payment')}>
                                <Icon name={paymentType === 'full_payment' ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color="#2563EB" />
                                <Text style={styles.paymentOptionText}>Full Payment</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentType('down_payment')}>
                                <Icon name={paymentType === 'down_payment' ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color="#2563EB" />
                                <Text style={styles.paymentOptionText}>
                                    Down Payment (₱{downPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {paymentType === 'down_payment' && (
                            <>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Custom Items (30%)</Text>
                                    <Text style={styles.summaryValue}>₱{(customizedTotal * 0.3).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Regular Items (100%)</Text>
                                    <Text style={styles.summaryValue}>₱{normalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Total Down Payment</Text>
                                    <Text style={styles.summaryValue}>₱{downPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Remaining Balance</Text>
                                    <Text style={styles.summaryValue}>₱{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                </View>
                            </>
                        )}
                    </>
                )}

                <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>₱{(getActualPaymentAmount() + shippingFee).toLocaleString()}</Text>
                </View>

                {/* AI Recommendations disabled: no popup */}
            </View>
        )
    }

    const renderStepContent = () => (
        <ScrollView contentContainerStyle={styles.content}>
            {renderAddressSummary()}
            {renderScheduleStep()}
            {renderOrderSummary()}
        </ScrollView>
    )

    const handleNext = async () => {
        if (currentStep === 1) {
            // validation for delivery
            if (deliveryMethod === 'delivery') {
                const requiredFields = ['phone', 'addressLine1', 'provinceName', 'cityName', 'brgyName'];
                const missing = requiredFields.filter(f => !shippingInfo[f]);
                if (missing.length > 0) {
                    Alert.alert('Incomplete Address', 'Please add your shipping address first.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Edit', onPress: () => router.push({ pathname: '/UserProfile', params: { editAddress: '1' } }) }
                    ]);
                    return;
                }
            }
            // save address if delivery
            if (deliveryMethod === 'delivery') {
                try {
                    const token = await AsyncStorage.getItem('token')
                    if (!token) throw new Error('Not logged in')
                    await fetch(`${API_BASE_URL}/api/user/address`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            ...shippingInfo,
                            province: shippingInfo.provinceCode,
                            city: shippingInfo.cityCode,
                            brgy: shippingInfo.brgyCode,
                        })
                    })
                } catch (err) {
                    console.error('Save address error', err)
                }
            }
        }

        // Require a date on step 2 before moving to summary
        if (currentStep === 2 && !scheduledDate) {
            Alert.alert('Select Date', 'Please choose a delivery/pick-up date before continuing.');
            return;
        }

        setCurrentStep(prev => Math.min(prev + 1, 3))
    }

    const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1))

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => currentStep === 1 ? router.back() : handleBack()}>
                    <Icon name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Checkout</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Delivery Method Toggle */}
            <View style={styles.methodToggleContainer}>
                <TouchableOpacity
                    style={[
                        styles.methodButton,
                        deliveryMethod === 'delivery' && styles.methodButtonActive
                    ]}
                    onPress={() => setDeliveryMethod('delivery')}
                >
                    <Text style={[
                        styles.methodText,
                        deliveryMethod === 'delivery' && styles.methodTextActive
                    ]}>
                        Delivery
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.methodButton,
                        deliveryMethod === 'pickup' && styles.methodButtonActive
                    ]}
                    onPress={() => setDeliveryMethod('pickup')}
                >
                    <Text style={[
                        styles.methodText,
                        deliveryMethod === 'pickup' && styles.methodTextActive
                    ]}>
                        Pickup
                    </Text>
                </TouchableOpacity>
            </View>

            {renderStepContent()}

            <View style={styles.bottomActions}>
                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handlePlaceOrder}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>Place Order & Pay</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* AI Recommendations Modal disabled */}
        </SafeAreaView>
    );
};

// --- Styles ---

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16, paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1,
        borderColor: '#D1D5DB', borderRadius: 8, color: 'black',
        paddingRight: 30, backgroundColor: '#F9FAFB', height: 48,
    },
    inputAndroid: {
        fontSize: 16, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1,
        borderColor: '#D1D5DB', borderRadius: 8, color: 'black',
        paddingRight: 30, backgroundColor: '#F9FAFB', height: 48,
    },
    placeholder: { color: '#A1A1AA' },
    iconContainer: { top: 12, right: 15 },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    content: { paddingBottom: 100 },
    header: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF",
        borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
    },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937" },
    formSection: {
        backgroundColor: "#FFFFFF", margin: 16, padding: 16, borderRadius: 12,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 3,
    },
    sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937", marginBottom: 16 },
    inputContainer: { marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 12,
        paddingVertical: 12, fontSize: 16, color: "#1F2937", backgroundColor: "#F9FAFB",
    },
    bottomActions: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: "row", padding: 16, backgroundColor: "#FFFFFF",
        borderTopWidth: 1, borderTopColor: "#E5E7EB",
    },
    button: {
        flex: 1, backgroundColor: "#2563EB", height: 48, borderRadius: 8,
        justifyContent: "center", alignItems: "center",
    },
    buttonDisabled: { backgroundColor: "#9CA3AF" },
    buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
    orderSummary: {
        backgroundColor: "#FFFFFF", margin: 16, marginTop: 0, padding: 16, borderRadius: 12,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 3,
    },
    summaryTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937", marginBottom: 16 },
    summaryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    summaryItemName: { fontSize: 14, color: "#374151", flex: 1 },
    summaryItemDetails: { fontSize: 12, color: "#6B7280", marginHorizontal: 8 },
    summaryItemPrice: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
    summaryDivider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    summaryLabel: { fontSize: 14, color: "#6B7280" },
    summaryValue: { fontSize: 14, color: "#1F2937", fontWeight: "500" },
    totalRow: { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 12, marginTop: 8 },
    totalLabel: { fontSize: 16, fontWeight: "bold", color: "#1F2937" },
    totalValue: { fontSize: 18, fontWeight: "bold", color: "#1F2937" },
    methodToggleContainer: { flexDirection: 'row', margin: 16, backgroundColor: '#F3F4F6', borderRadius: 8 },
    methodButton: { flex: 1, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
    methodButtonActive: { backgroundColor: '#2563EB' },
    methodText: { color: '#374151', fontWeight: '500' },
    methodTextActive: { color: '#FFFFFF', fontWeight: '600' },
    datePickerButton: { padding: 16, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center' },
    datePickerText: { color: '#1F2937', fontSize: 16 },
    editAddressButton: { padding: 16, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center' },
    editAddressButtonText: { color: '#1F2937', fontSize: 16 },
    paymentOptionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 16,
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentOptionText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#374151',
    },
    // --- NEW: AI Recommendations Modal Styles ---
    modalContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    closeButton: {
        padding: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
    recommendationsGrid: {
        padding: 16,
        paddingBottom: 100,
    },
    recommendationCard: {
        flex: 1,
        margin: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    recommendationImage: {
        width: '100%',
        height: 140,
        backgroundColor: '#F3F4F6',
    },
    recommendationInfo: {
        padding: 12,
    },
    recommendationName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
        lineHeight: 18,
    },
    recommendationPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2563EB',
        marginBottom: 4,
    },
    matchScore: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '500',
    },
    emptyRecommendations: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
    modalFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    continueButton: {
        backgroundColor: '#2563EB',
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    recommendationsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F0F9FF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2563EB',
    },
    recommendationsButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#2563EB',
    },
});

export default Checkout;