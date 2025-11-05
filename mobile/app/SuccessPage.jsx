"use client"

import { useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { API_BASE_URL } from "@env";
const SuccessPage = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { orderId } = params // Get orderId passed from the checkout page
  const scaleValue = new Animated.Value(0)
  const fadeValue = new Animated.Value(0)

  useEffect(() => {
    // Animate success icon
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handleBackHome = () => {
    router.replace('/MainTabs') // Use router.replace for navigation
  }

  const handleViewOrder = () => {
    if (orderId) {
      router.push({ pathname: 'OrderDetail', params: { orderId: orderId } })
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successCard}>
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleValue }] }]}>
            <View style={styles.successIcon}>
              <Icon name="check" size={48} color="#FFFFFF" />
            </View>
          </Animated.View>

          <Animated.View style={[styles.textContainer, { opacity: fadeValue }]}>
            <Text style={styles.successTitle}>Order Placed Successfully!</Text>
            <Text style={styles.successSubtitle}>
              Thank you for your purchase. Your order has been confirmed and will be processed shortly.
            </Text>
          </Animated.View>

          <View style={styles.orderSummary}>
            <Text style={styles.orderSummaryTitle}>Order Summary</Text>

            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Order Number</Text>
              <Text style={styles.orderValue}>#{orderId || "N/A"}</Text>
            </View>

            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Payment Method</Text>
              <Text style={styles.orderValue}>Online Payment</Text>
            </View>

            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Estimated Delivery</Text>
              <Text style={styles.orderValue}>5-7 business days</Text>
            </View>
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleViewOrder}>
              <Icon name="receipt" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>View Order Details</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleBackHome}>
              <Icon name="home" size={20} color="#2563EB" />
              <Text style={styles.secondaryButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Icon name="email" size={20} color="#6B7280" />
              <Text style={styles.infoText}>Confirmation email sent to your inbox</Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="local-shipping" size={20} color="#6B7280" />
              <Text style={styles.infoText}>Track your order in the Orders section</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 400,
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    marginBottom: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  orderSummary: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  orderSummaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  orderValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  actionContainer: {
    width: "100%",
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: "row",
    backgroundColor: "transparent",
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  infoContainer: {
    width: "100%",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
    flex: 1,
  },
})

export default SuccessPage
