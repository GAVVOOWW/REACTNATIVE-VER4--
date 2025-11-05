"use client"

import { useState, useEffect } from "react"
import { API_BASE_URL } from "@env";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'

const Cart = () => {
  const router = useRouter()
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [showRecModal, setShowRecModal] = useState(false)
  const [recItems, setRecItems] = useState([])
  const [aiAnalysis, setAiAnalysis] = useState(null) // ← Add this
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [recError, setRecError] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set());

 

  useEffect(() => {
    getUserData()
  }, [])

  useEffect(() => {
    if (userId) {
      fetchCartItems()
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchCartItems()
    }
  }, [userId])

  useEffect(() => {
    setSelectedIds(new Set(cartItems.map(ci => ci.item?._id)))
  }, [cartItems])

  const getUserData = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId')
      if (storedUserId) {
        setUserId(storedUserId)
      } else {
        Alert.alert("Error", "Please login first", [
          { text: "OK", onPress: () => router.push("/Login") }
        ])
      }
    } catch (error) {
      console.error("Error getting user data:", error)
    }
  }

  const getAuthToken = async () => {
    try {
      return await AsyncStorage.getItem('token')
    } catch (error) {
      console.error("Error getting auth token:", error)
      return null
    }
  }

  const fetchCartItems = async () => {
    try {
      const token = await getAuthToken()
      if (!token) {
        Alert.alert("Error", "Please login first")
        router.push("/Login")
        return
      }

      console.log("Fetching cart items for user:", userId)

      const response = await fetch(`${API_BASE_URL}/api/cart/${userId}/items`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      console.log("Cart response status:", response.status)
      const data = await response.json()

      if (response.ok && data.success) {
        const validItems = data.items ? data.items.filter(ci => ci.item) : [];
        if (validItems.length !== (data.items?.length || 0)) {
          console.warn("Filtered out some invalid cart items that no longer exist.");
        }
        setCartItems(validItems);
      } else {
        console.error("Failed to fetch cart items:", data.message)
        if (response.status === 401) {
          Alert.alert("Session Expired", "Please login again", [
            { text: "OK", onPress: () => router.push("/Login") }
          ])
        } else {
          Alert.alert("Error", data.message || "Failed to fetch cart items")
        }
      }
    } catch (error) {
      console.error("Error fetching cart items:", error)
      Alert.alert("Network Error", "Unable to fetch cart items. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const updateItemQuantity = async (itemId, action) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const endpoint = action === 'increase' ? 'increase' : 'decrease'

      const response = await fetch(`${API_BASE_URL}/api/cart/${userId}/item/${itemId}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setCartItems(data.CartData.items || [])
      } else {
        Alert.alert("Error", data.message || `Failed to ${action} quantity`)
      }
    } catch (error) {
      console.error(`Error ${action}ing quantity:`, error)
      Alert.alert("Network Error", `Unable to ${action} quantity`)
    }
  }

  const removeFromCart = async (itemId) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => performRemoveFromCart(itemId) }
      ]
    )
  }

  const performRemoveFromCart = async (itemId) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/cart/${userId}/item/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setCartItems(data.CartData.items || [])
        Alert.alert("Success", "Item removed from cart")
      } else {
        Alert.alert("Error", data.message || "Failed to remove item")
      }
    } catch (error) {
      console.error("Error removing item:", error)
      Alert.alert("Network Error", "Unable to remove item")
    }
  }

  const calculateSubtotal = () => {
    return cartItems.reduce((total, cartItem) => {
      if (!selectedIds.has(cartItem.item?._id)) return total
      const price = cartItem.customPrice ?? cartItem.item?.price ?? 0;
      return total + price * (cartItem.quantity || 0);
    }, 0)
  }

  const calculateTotals = () => {
    const subtotal = calculateSubtotal();
    const discount = 0; // coupons etc.
    const shipping = 0;
    const tax = 0; // VAT removed
    const total = subtotal + shipping - discount; // no tax added
    return { subtotal, shipping, tax, discount, total };
  }

  const fetchRecommendations = async () => {
    try {
      setLoadingRecs(true)
      setRecError('')
      const token = await getAuthToken()
      const selectedIdsArr = Array.from(selectedIds)
      if (selectedIdsArr.length === 0) {
        setRecItems([])
        return
      }
      const res = await fetch(`${API_BASE_URL}/api/items/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedIds: selectedIdsArr }),
      })
      const data = await res.json()
      if (res.ok && Array.isArray(data.ItemData)) {
        console.log("[CART-REC]: Successfully received AI recommendations:", data)
        console.log("[CART-REC]: Checking for AI explanations in items...")
        data.ItemData.forEach((item, index) => {
          console.log(`[CART-REC]: Item ${index + 1} - Name: ${item.name}, AI Explanation: ${item.aiExplanation || 'NOT FOUND'}`)
        })
        setRecItems(data.ItemData)
        setAiAnalysis(data.analysis) // ← Add this line
      } else {
        setRecError(data.message || 'Could not load recommendations')
      }
    } catch (err) {
      setRecError(err.message)
    } finally {
      setLoadingRecs(false)
    }
  }

  const toggleSelect = (itemId) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const quickAddRec = (rec) => {
    if (cartItems.find(e => e.item?._id === rec._id)) return
    const entry = { item: rec, quantity: 1, price: rec.price }
    setCartItems(prev => [...prev, entry])
    // TODO: Optionally sync with backend add-to-cart endpoint
    Alert.alert('Added', `Added ${rec.name} to your cart`)
  }

  const handleCheckout = () => {
    if (selectedIds.size === 0) {
      Alert.alert('Select Items', 'Please select at least one item to checkout')
      return
    }
    if (cartItems.length === 0) {
      Alert.alert("Empty Cart", "Please add items to your cart before checkout")
      return
    }
    // Show recommendations first
    setShowRecModal(true)
    fetchRecommendations()
  }

  const proceedToCheckout = () => {
    const selectedCart = cartItems.filter(ci => selectedIds.has(ci.item?._id))
    const totals = calculateTotals()
    setShowRecModal(false)
    console.log("Proceeding to checkout with:", { selectedItems: selectedCart, summary: totals })
    router.push({ pathname: '/checkout', params: { items: JSON.stringify(selectedCart), summary: JSON.stringify(totals) } })
  }

  const renderCartItem = ({ item: cartItem }) => {
    // Fallback for older cart items that may not have a populated item object
    if (!cartItem || !cartItem.item) {
      return (
        <View style={styles.itemContainer}>
          <Text style={styles.itemName}>This item is no longer available</Text>
        </View>
      )
    }

    // Determine price, prioritizing custom price
    const price = cartItem.customPrice || cartItem.item.price || 0

    return (
      <View style={styles.itemContainer}>
        <TouchableOpacity onPress={() => toggleSelect(cartItem.item._id)}>
          <Icon
            name={selectedIds.has(cartItem.item._id) ? 'check-box' : 'check-box-outline-blank'}
            size={24}
            color="#2563EB"
          />
        </TouchableOpacity>

        <Image
          source={{ uri: Array.isArray(cartItem.item.imageUrl) ? cartItem.item.imageUrl[0] : cartItem.item.imageUrl }}
          style={styles.itemImage}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>{cartItem.item.name}</Text>

          {cartItem.customizations ? (
            <View>
              <Text style={styles.customizationText}>
                Custom: {cartItem.customizations.dimensions.length}x{cartItem.customizations.dimensions.width}x{cartItem.customizations.dimensions.height} ft
              </Text>
            </View>
          ) : null}
          <Text style={styles.itemPrice}>₱{price.toLocaleString()}</Text>

        </View>
        <View style={styles.quantityContainer}>
          <TouchableOpacity style={styles.quantityButton} onPress={() => updateItemQuantity(cartItem.item._id, 'decrease')}>
            <Icon name="remove" size={18} color="#6B7280" />
          </TouchableOpacity>

          <Text style={styles.quantityText}>{cartItem.quantity || 0}</Text>

          <TouchableOpacity style={styles.quantityButton} onPress={() => updateItemQuantity(cartItem.item._id, 'increase')}>
            <Icon name="add" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => removeFromCart(cartItem.item._id)}>
          <Icon name="delete-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    )
  }

  const { subtotal, shipping, tax, discount, total } = calculateTotals()

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading cart...</Text>
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
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <View style={styles.headerSpacer} />
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyCart}>
          <Icon name="shopping-cart" size={64} color="#D1D5DB" />
          <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
          <Text style={styles.emptyCartText}>
            Add some products to get started
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push("/productListing")}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Cart Items */}
          <FlatList
            data={cartItems}
            keyExtractor={(item, index) => `${item.item?._id}-${index}`}
            renderItem={renderCartItem}
            contentContainerStyle={styles.cartList}
            showsVerticalScrollIndicator={false}
          />

          {/* Summary */}
          <View style={styles.summaryContainer}>


            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>
                  -₱{discount.toLocaleString()}
                </Text>
              </View>
            )}






            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₱{total.toLocaleString()}</Text>
            </View>

            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
              <Text style={styles.checkoutButtonText}>
                Proceed to Checkout • ₱{total.toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Recommendations Modal */}
      <Modal
        visible={showRecModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRecModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: Dimensions.get('window').height * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI-Powered Recommendations</Text>
              <TouchableOpacity onPress={() => setShowRecModal(false)}>
                <Icon name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {/* AI Analysis Section */}
          

            {/* Cart Items Summary */}
            {cartItems.length > 0 && (
              <View style={styles.cartSummaryContainer}>
                <Text style={styles.cartSummaryTitle}>Your Cart Items:</Text>
                <View style={styles.cartItemsList}>
                  {cartItems.map((entry, index) => (
                    <View key={index} style={styles.cartItemBadge}>
                      <Text style={styles.cartItemText}>
                        {entry.item.name} (×{entry.quantity})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {loadingRecs ? (
              <View style={styles.modalBodyCenter}><ActivityIndicator size="large" color="#2563EB" /></View>
            ) : recError ? (
              <View style={styles.modalBodyCenter}><Text style={{ color: '#EF4444' }}>{recError}</Text></View>
            ) : recItems.length === 0 ? (
              <View style={styles.modalBodyCenter}><Text>No recommendations at this time.</Text></View>
            ) : (
              <FlatList
                data={recItems.slice(0, 3)} // Only show first 3 items
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <View style={styles.recCard}>
                    <Image
                      source={{ uri: Array.isArray(item.imageUrl) ? item.imageUrl[0] : item.imageUrl || 'https://via.placeholder.com/80' }}
                      style={styles.recImage}
                    />
                    <View style={styles.recInfo}>
                      <Text style={styles.recName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.recPrice}>₱{item.price?.toLocaleString()}</Text>
                      {/* AI Explanation for each item */}
                      {item.aiExplanation ? (
                        <Text style={styles.recExplanation}>
                          {item.aiExplanation}
                        </Text>
                      ) : (
                        <Text style={styles.recExplanation}>
                          No AI explanation available
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.addButton, item.stock === 0 && { backgroundColor: '#D1D5DB' }]}
                      disabled={item.stock === 0}
                      onPress={() => quickAddRec(item)}
                    >
                      <Text style={styles.addButtonText}>{item.stock === 0 ? 'Out' : 'Add'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 16 }}
              />
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalFooterButton} onPress={() => setShowRecModal(false)}>
                <Text style={styles.modalFooterButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalFooterButton, { backgroundColor: '#2563EB' }]} onPress={proceedToCheckout}>
                <Text style={[styles.modalFooterButtonText, { color: '#FFFFFF' }]}>Proceed to Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
  },
  headerSpacer: {
    width: 24,
  },
  emptyCart: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyCartTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCartText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
  },
  shopButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cartList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  itemContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flexShrink: 1,
  },
  customizationText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "bold",
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    padding: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: "center",
  },
  summaryContainer: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  discountValue: {
    color: "#10B981",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  checkoutButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  modalBodyCenter: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  recCard: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8,
  },
  recImage: { width: 60, height: 60, borderRadius: 6, marginRight: 12 },
  recInfo: { flex: 1 },
  recName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  recPrice: { fontSize: 13, color: '#2563EB', marginTop: 4 },
  recExplanation: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  addButton: {
    backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  modalFooterButton: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#E5E7EB', marginLeft: 8,
  },
  modalFooterButtonText: { color: '#1F2937', fontWeight: '600' },
  aiAnalysisContainer: {
    backgroundColor: '#EFF6FF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  aiAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiAnalysisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  aiAnalysisText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  aiAnalysisDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aiAnalysisDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiAnalysisLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 4,
  },
  aiAnalysisValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '500',
  },
  cartSummaryContainer: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  cartSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  cartItemsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cartItemBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cartItemText: {
    fontSize: 12,
    color: '#374151',
  },
})

export default Cart
