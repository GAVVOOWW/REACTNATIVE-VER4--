"use client"
import { API_BASE_URL } from "@env";
import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
  AppState,
  Modal,
  TextInput,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useLocalSearchParams, useRouter } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'

const OrderDetail = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { orderId } = params

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPaying, setIsPaying] = useState(false)
  // Controls loading state while submitting a review
  const [isAddingReview, setIsAddingReview] = useState(false)
  // Reviews keyed by itemId so we can show them inline per item
  const [reviews, setReviews] = useState({})
  // Controls add-review modal
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  // Which item are we adding / editing review for?
  const [reviewItem, setReviewItem] = useState(null)
  const appState = useRef(AppState.currentState)



  // AppState Polling for automatic payment confirmation for remaining balance
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log(`[AppState] Changed from ${appState.current} to ${nextAppState}`);
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[AppState] App is now active. Checking for pending payment.');
        const orderIdForCheck = await AsyncStorage.getItem('currentOrderId');
        console.log(`[AppState] Found orderId in storage: ${orderIdForCheck}`);
        console.log(`[AppState] Current page orderId: ${orderId}`);

        // Only proceed if there's an orderId stored and it matches the current order being viewed
        if (orderIdForCheck && orderIdForCheck === orderId) {
          console.log('[AppState] Order ID matches. Proceeding to check status.');
          try {
            const token = await getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/order/${orderIdForCheck}/status`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
              const updatedOrder = await res.json();
              console.log('[AppState] Successfully fetched order status:', JSON.stringify(updatedOrder, null, 2));
              console.log(`[AppState] Remaining Balance from API: ${updatedOrder.balance}`);

              // Check if the remaining balance has been paid off
              if (!updatedOrder.balance || updatedOrder.balance === 0) {
                console.log('[AppState] Remaining balance is 0. Redirecting to SuccessPage.');
                await AsyncStorage.removeItem('currentOrderId');
                // Redirect to success page to give user feedback
                router.replace({ pathname: 'SuccessPage', params: { orderId: orderIdForCheck } });
              } else {
                console.log('[AppState] Remaining balance is not 0 yet. No redirect.');
              }
            } else {
              const errorText = await res.text();
              console.error(`[AppState] Failed to fetch order status. Status: ${res.status}, Body: ${errorText}`);
            }
          } catch (error) {
            console.error('[AppState] Error checking order status after paying balance:', error);
          }
        } else {
          console.log('[AppState] No matching order ID found. Skipping status check.');
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      console.log('[AppState] Removing AppState listener.');
      subscription.remove();
    };
  }, [orderId, router]);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails()
    } else {
      Alert.alert("Error", "Order ID is missing.", [
        { text: "OK", onPress: () => router.back() }
      ])
    }
  }, [orderId])

  // Whenever order data is ready, load reviews for its items
  useEffect(() => {
    if (order) {
      fetchReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // Fetch reviews for every item in this order and store in state
  const fetchReviews = async () => {
    try {
      if (!order || !order.items) return;
      const token = await getAuthToken();

      const promises = order.items.map((orderItem) =>
        fetch(`${API_BASE_URL}/api/items/${orderItem.item._id}/reviews`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }).then((res) => res.json())
      );

      const results = await Promise.all(promises);
      const map = {};
      results.forEach((res, idx) => {
        if (res && res.success) {
          map[order.items[idx].item._id] = res.reviews || [];
        }
      });
      setReviews(map);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const getAuthToken = async () => {
    try {
      return await AsyncStorage.getItem('token')
    } catch (error) {
      console.error("Error getting auth token:", error)
      return null
    }
  }

  const fetchOrderDetails = async () => {
    try {
      const token = await getAuthToken()
      if (!token) {
        Alert.alert("Error", "Please login first", [
          { text: "OK", onPress: () => router.push("/Login") }
        ])
        return
      }

      console.log("Fetching details for order:", orderId)

      // Since there is no direct `/api/orders/:id` for users,
      // we fetch all orders and filter by ID.
      // This is not ideal for performance but works with the current backend.
      const response = await fetch(`${API_BASE_URL}/api/user/orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      console.log("Orders response status:", response.status)

      if (response.ok) {
        const orders = await response.json()
        const foundOrder = orders.find(o => o._id === orderId)

        if (foundOrder) {
          console.log("=== ORDER DETAIL DEBUG ===")
          console.log("Order details found:", foundOrder)
          console.log("Order status:", foundOrder.status)
          console.log("Delivery proof:", foundOrder.deliveryProof)
          console.log("Delivery date:", foundOrder.deliveryDate)
          console.log("Full order object keys:", Object.keys(foundOrder))
          console.log("Full order object:", JSON.stringify(foundOrder, null, 2))
          setOrder(foundOrder)
        } else {
          Alert.alert("Error", "Order not found.")
          router.back()
        }
      } else {
        const errorData = await response.json()
        console.error("Failed to fetch order details:", errorData)
        Alert.alert("Error", errorData.error || "Failed to fetch order details")
      }
    } catch (error) {
      console.error("Error fetching order details:", error)
      Alert.alert("Network Error", "Unable to fetch order details. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handlePayFullAmount = async () => {
    if (order.balance <= 0) {
      Alert.alert("Fully Paid", "This order has no remaining balance.");
      return;
    }

    Alert.alert(
      "Confirm Payment",
      `Complete payment for the remaining balance of ₱${order.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed to Pay",
          onPress: async () => {
            setIsPaying(true);
            try {
              const token = await getAuthToken();

              // Save order ID to check status upon returning to app
              await AsyncStorage.setItem('currentOrderId', order._id);

              const response = await fetch(
                `${API_BASE_URL}/api/orders/${order._id}/complete-payment`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              const data = await response.json();

              if (response.ok && data.checkoutUrl) {
                await Linking.openURL(data.checkoutUrl);
              } else {
                throw new Error(data.message || "Failed to create payment session.");
              }
            } catch (error) {
              console.error("Error creating payment session:", error);
              Alert.alert("Payment Error", error.message);
            } finally {
              setIsPaying(false);
            }
          }
        }
      ]
    )
  };

  const handleCancelOrder = async () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getAuthToken()
              if (!token) return

              const response = await fetch(`${API_BASE_URL}/api/orders/${order._id}/cancel`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
              })

              const data = await response.json()
              if (response.ok && data.success) {
                Alert.alert("Success", "Order has been cancelled.")
                fetchOrderDetails() // Refresh data
              } else {
                Alert.alert("Error", data.message || "Failed to cancel order.")
              }
            } catch (error) {
              console.error("Error cancelling order:", error)
              Alert.alert("Network Error", "Could not cancel order.")
            }
          }
        }
      ]
    )
  }

  const handleRefundRequest = async () => {
    Alert.alert(
      "Request Refund",
      "Are you sure you want to request a refund for this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Refund",
          style: "default",
          onPress: async () => {
            try {
              const token = await getAuthToken();
              if (!token) return;

              // You'll need to implement this endpoint on your backend
              const response = await fetch(`${API_BASE_URL}/api/orders/${order._id}/refund-request`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  reason: "Customer requested refund", // You could add a reason input field if needed
                })
              });

              if (response.ok) {
                const data = await response.json();
                Alert.alert(
                  "Refund Requested",
                  "Your refund request has been submitted. Our team will review it shortly."
                );
                fetchOrderDetails(); // Refresh order data
              } else {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to request refund");
              }
            } catch (error) {
              console.error("Error requesting refund:", error);
              Alert.alert("Error", error.message || "Failed to request refund. Please try again later.");
            }
          }
        }
      ]
    );
  };

  const handleAddReview = () => {
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewItem) return;
    if (!reviewText.trim()) {
      Alert.alert('Error', 'Please enter a review description.');
      return;
    }

    setIsAddingReview(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/items/${reviewItem._id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ description: reviewText, star: reviewRating }),
      });

      if (response.ok) {
        Alert.alert('Review Submitted', 'Thank you!');
        setShowReviewModal(false);
        setReviewText('');
        setReviewRating(5);
        fetchReviews();
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Submit review error:', err);
      Alert.alert('Error', err.message || 'Could not submit review.');
    } finally {
      setIsAddingReview(false);
    }
  };

  // Delete review
  const handleDeleteReview = async (itemId, reviewId) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete your review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const token = await getAuthToken();
            const res = await fetch(`${API_BASE_URL}/api/items/${itemId}/reviews/${reviewId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              fetchReviews();
            } else {
              const data = await res.json();
              Alert.alert('Error', data.message || 'Failed to delete review.');
            }
          } catch (err) {
            console.error('Delete review error:', err);
            Alert.alert('Network Error', 'Unable to delete review.');
          }
        }
      }
    ]);
  };

  const renderReviewModal = () => (
    <Modal
      visible={showReviewModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowReviewModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Your Review</Text>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>Rate your experience</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setReviewRating(star)}
                style={styles.starButton}
              >
                <Icon
                  name="star"
                  size={32}
                  color={star <= reviewRating ? "#F59E0B" : "#D1D5DB"}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.modalSubtitle}>Write your review</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your experience with this product..."
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => {
                setShowReviewModal(false);
                setReviewText('');
                setReviewRating(5);
              }}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitReviewButton}
              onPress={handleSubmitReview}
              disabled={isAddingReview}
            >
              {isAddingReview ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitReviewButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "#10B981"
      case "on process":
      case "requesting for refund":
        return "#2563EB"
      case "ready for pickup":
        return "#8B5CF6"
      case "refunded":
        return "#F59E0B"
      case "cancelled":
        return "#EF4444"
      default:
        return "#6B7280"
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Check if the order contains any customized items
  const isCustomizedOrder = () => {
    if (!order || !order.items || !Array.isArray(order.items)) return false;
    return order.items.some(item =>
      item.item?.is_customizable === true ||
      item.customizations ||
      order.paymentType === 'down_payment'
    );
  }

  const renderOrderItem = (orderItem) => {
    const item = orderItem.item;
    const itemReviews = reviews[item._id] || [];
    const currentUserId = order?.user?._id || order?.user;
    const userReview = itemReviews.find(r => r.userId === currentUserId);

    return (
      <View key={item?._id}>
        <View style={styles.orderItem}>
          <Image
            source={{ uri: Array.isArray(item?.imageUrl) ? item.imageUrl[0] : item?.imageUrl }}
            style={styles.itemImage}
          />
          <View style={styles.itemDetails}>
            <Text style={styles.itemName} numberOfLines={2}>{item?.name}</Text>
            <Text style={styles.itemPrice}>₱{orderItem.price?.toLocaleString()}</Text>
          </View>
          <View style={styles.itemQuantity}>
            <Text style={styles.quantityText}>x{orderItem.quantity}</Text>
          </View>
        </View>

        {/* Inline Review */}
        <View style={styles.reviewSection}>
          {userReview ? (
            <>
              <View style={styles.reviewHeader}>
                <View style={[styles.ratingContainer, { justifyContent: 'flex-start' }] }>
                  {[1,2,3,4,5].map(star => (
                    <Icon key={star} name="star" size={18} color={star<=userReview.star? '#F59E0B':'#D1D5DB'} />
                  ))}
                </View>
                <TouchableOpacity onPress={() => handleDeleteReview(item._id, userReview._id)}>
                  <Icon name="delete" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <Text style={styles.reviewText}>{userReview.description}</Text>
            </>
          ) : (
            <TouchableOpacity style={styles.addReviewButton} onPress={() => { setReviewItem(item); setShowReviewModal(true); }}>
              <Icon name="rate-review" size={16} color="#2563EB" />
              <Text style={styles.addReviewText}>Add Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderPaymentSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Summary</Text>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Total Amount</Text>
        <Text style={styles.infoValue}>₱{(order.totalAmount || order.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
      </View>

      {order.paymentType === 'down_payment' ? (
        <>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Down Payment Paid</Text>
            <Text style={styles.infoValue}>₱{order.amountPaid?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shipping Fee</Text>
            <Text style={styles.infoValue}>₱{order.shippingFee?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.infoRow} >
            <Text style={[styles.infoLabel, { fontWeight: 'bold' }]}>Remaining Balance</Text>
            <Text style={[styles.infoValue, { color: '#EF4444', fontWeight: 'bold' }]}>
              ₱{order.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Amount Paid</Text>
          <Text style={styles.infoValue}>₱{(order.totalAmount || order.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        </View>
      )}
    </View>
  );

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Order Information</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{order.status?.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID</Text>
            <Text style={styles.infoValue}>#{order._id.slice(-8)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date</Text>
            <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status</Text>
            <Text style={styles.infoValue}>{order.paymentStatus}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shipping Method</Text>
            <Text style={styles.infoValue}>{order.deliveryOption === 'delivery' ? 'Delivery' : 'Pickup'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.items?.length || 0})</Text>
          {order.items.map(renderOrderItem)}
        </View>

        {renderPaymentSummary()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <Text style={styles.addressText}>
            {order.user?.address?.fullName || order.user?.name || "Name not provided"}
          </Text>
          <Text style={styles.addressText}>
            {order.user?.address?.addressLine1 || order.address || "Address not provided"}
          </Text>
          {order.user?.address?.addressLine2 && (
            <Text style={styles.addressText}>{order.user.address.addressLine2}</Text>
          )}
          {order.user?.address?.brgyName && (
            <Text style={styles.addressText}>{order.user.address.brgyName}</Text>
          )}
          {order.user?.address?.cityName && order.user?.address?.provinceName && (
            <Text style={styles.addressText}>
              {order.user.address.cityName}, {order.user.address.provinceName}
            </Text>
          )}
          {order.user?.address?.postalCode && (
            <Text style={styles.addressText}>{order.user.address.postalCode}</Text>
          )}
          <Text style={styles.addressText}>
            {order.user?.phone || order.phone || "Phone not provided"}
          </Text>
        </View>

        {/* Delivery Proof Section */}
        {order.status === 'Delivered' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery Status</Text>
              <View style={styles.deliveryBadge}>
                <Icon name="verified" size={16} color="#10B981" />
                <Text style={styles.deliveryBadgeText}>Delivered</Text>
              </View>
            </View>



            {order.deliveryProof ? (
              <>
                <Text style={styles.deliveryDescription}>
                  Photo confirmation of your delivered order taken by our delivery team.
                </Text>
                {order.deliveryDate && (
                  <Text style={styles.deliveryDate}>
                    Delivered on: {formatDate(order.deliveryDate)}
                  </Text>
                )}
                <View style={styles.deliveryProofContainer}>
                  <Image
                    source={{ uri: order.deliveryProof }}
                    style={styles.deliveryProofImage}
                    resizeMode="cover"
                    onError={(error) => console.log('Image load error:', error)}
                    onLoad={() => console.log('Image loaded successfully')}
                  />
                  <TouchableOpacity
                    style={styles.viewFullImageButton}
                    onPress={() => {
                      Alert.alert(
                        "Delivery Proof",
                        "This photo confirms your order was successfully delivered to the specified address.",
                        [{ text: "OK" }]
                      );
                    }}
                  >
                    <Icon name="zoom-in" size={20} color="#2563EB" />
                    <Text style={styles.viewFullImageText}>Proof of Delivery</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.noProofText}>
                Your order has been completed. Delivery proof may not be available for this order.
              </Text>
            )}
          </View>
        )}
      </ScrollView>


      {order.status === 'On Process' && (
        <View style={styles.footer}>
          {order.paymentType === 'down_payment' && order.balance > 0 ? (
            <TouchableOpacity style={styles.primaryButton} onPress={handlePayFullAmount} disabled={isPaying}>
              {isPaying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="payment" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    Pay Remaining (₱{order.balance ? order.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : !isCustomizedOrder() ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.refundButton} onPress={handleRefundRequest}>
                <Icon name="currency-exchange" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Request Refund</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      {(order.status === 'Delivered' || order.status === 'Picked Up') && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.reviewButton} onPress={handleAddReview}>
            <Icon name="rate-review" size={20} color="#FFFFFF" />
            <Text style={styles.reviewButtonText}>Add a Review</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderReviewModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B7280' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  refundButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F59E0B',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  headerSpacer: { width: 24 },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#FFFFFF', fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  orderItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  itemImage: { width: 56, height: 56, borderRadius: 8, marginRight: 12 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  itemPrice: { fontSize: 14, color: '#6B7280' },
  itemQuantity: { paddingHorizontal: 12 },
  quantityText: { fontSize: 14, color: '#1F2937' },
  addressText: { fontSize: 14, color: '#1F2937', marginBottom: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 12, marginTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  footer: { padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: { borderColor: '#EF4444', borderWidth: 1, padding: 16, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: '#EF4444', fontWeight: 'bold' },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#10B981'
  },
  deliveryBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 12
  },
  deliveryDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20
  },
  deliveryDate: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 12
  },
  deliveryProofContainer: {
    alignItems: 'center',
    marginTop: 8
  },
  deliveryProofImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F3F4F6'
  },
  viewFullImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderColor: '#2563EB',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    width: '100%',
    justifyContent: 'center'
  },
  viewFullImageText: {
    color: '#2563EB',
    fontWeight: '600',
    marginLeft: 8
  },
  debugContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  debugText: {
    color: '#374151',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2
  },
  noProofText: {
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8
  },
  reviewButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starButton: {
    marginHorizontal: 4,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelModalButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  submitReviewButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  submitReviewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewSection: {
    paddingLeft: 68, // indent below image
    paddingVertical: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewText: {
    fontSize: 14,
    color: '#374151',
    marginTop: 2,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addReviewText: {
    marginLeft: 4,
    color: '#2563EB',
    fontWeight: '500',
    fontSize: 14,
  },
})

export default OrderDetail
