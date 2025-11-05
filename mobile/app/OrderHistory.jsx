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
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'

const OrderHistory = () => {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)



  const filters = [
    { key: "all", label: "All Orders" },
    { key: "On Process", label: "On Process" },
    { key: "Delivered", label: "Delivered" },
    { key: "Requesting for Refund", label: "Requesting for Refund" },
    { key: "Refunded", label: "Refunded" },
    { key: "Cancelled", label: "Cancelled" },
  ]

  useEffect(() => {
    fetchOrders()
  }, [])

  const getAuthToken = async () => {
    try {
      return await AsyncStorage.getItem('token')
    } catch (error) {
      console.error("Error getting auth token:", error)
      return null
    }
  }

  const fetchOrders = async () => {
    try {
      const token = await getAuthToken()
      if (!token) {
        Alert.alert("Error", "Please login first", [
          { text: "OK", onPress: () => router.push("/Login") }
        ])
        return
      }

      console.log("Fetching user orders...")

      const response = await fetch(`${API_BASE_URL}/api/user/orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      console.log("Orders response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Orders fetched successfully:", data.length, "orders")
        console.log("Sample order data:", data[0]) // Debug: log first order structure
        setOrders(data)
      } else {
        const errorData = await response.json()
        console.error("Failed to fetch orders:", errorData)
        if (response.status === 401) {
          Alert.alert("Session Expired", "Please login again", [
            { text: "OK", onPress: () => router.push("/Login") }
          ])
        } else {
          Alert.alert("Error", errorData.error || "Failed to fetch orders")
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      Alert.alert("Network Error", "Unable to fetch orders. Please check your connection.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchOrders()
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items?.some(item =>
        item.item?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )

    const matchesFilter = selectedFilter === "all" || order.status === selectedFilter

    return matchesSearch && matchesFilter
  })

  const handleOrderPress = (order) => {
    router.push({
      pathname: "/OrderDetail",
      params: { orderId: order._id }
    })
  }

  const handleTrackOrder = (order) => {
    Alert.alert(
      "Track Order",
      `Order ID: ${order._id}\nStatus: ${order.status}\nAmount: ₱${(order.totalAmount || order.amount || 0).toLocaleString()}`,
      [{ text: "OK" }]
    )
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'on process':
        return '#F59E0B'
      case 'delivered':
        return '#10B981'
      case 'requesting for refund':
        return '#F59E0B'
      case 'refunded':
        return '#059669'
      case 'cancelled':
        return '#EF4444'
      default:
        return '#6B7280'
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'on process':
        return 'schedule'
      case 'delivered':
        return 'check-circle'
      case 'requesting for refund':
        return 'undo'
      case 'refunded':
        return 'payment'
      case 'cancelled':
        return 'cancel'
      default:
        return 'info'
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  const renderOrderItem = ({ item: order }) => (
    <TouchableOpacity style={styles.orderCard} onPress={() => handleOrderPress(order)}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Order #{order._id ? order._id.slice(-8).toUpperCase() : 'Unknown'}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt || order.date)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status || 'unknown') }]}>
          <Icon
            name={getStatusIcon(order.status || 'unknown')}
            size={14}
            color="#FFFFFF"
            style={styles.statusIcon}
          />
          <Text style={styles.statusText}>{(order.status || 'PENDING').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        <Text style={styles.itemsLabel}>Items ({order.items?.length || 0}):</Text>
        {order.items?.slice(0, 2).map((orderItem, index) => (
          <Text key={index} style={styles.itemName} numberOfLines={1}>
            • {orderItem.item?.name || 'Unknown Item'} (x{orderItem.quantity})
          </Text>
        ))}
        {order.items?.length > 2 && (
          <Text style={styles.moreItems}>
            +{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.orderAmount}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>₱{(order.totalAmount || order.amount || 0).toLocaleString()}</Text>
          {order.paymentStatus && (
            <Text style={styles.paymentStatus}>Payment: {order.paymentStatus}</Text>
          )}
        </View>
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={(e) => {
              e.stopPropagation()
              handleTrackOrder(order)
            }}
          >
            <Icon name="visibility" size={16} color="#2563EB" />
            <Text style={styles.trackButtonText}>Track</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading orders...</Text>
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
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === item.key && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === item.key && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="receipt-long" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            {searchQuery || selectedFilter !== "all"
              ? "No matching orders"
              : "No orders yet"}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery || selectedFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Your order history will appear here once you make a purchase"}
          </Text>
          {!searchQuery && selectedFilter === "all" && (
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push("/productListing")}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#1F2937",
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  ordersList: {
    paddingHorizontal: 16,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  orderItems: {
    marginBottom: 12,
  },
  itemsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderAmount: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  paymentStatus: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  orderActions: {
    flexDirection: "row",
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
  },
  trackButtonText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "500",
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
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
})

export default OrderHistory
