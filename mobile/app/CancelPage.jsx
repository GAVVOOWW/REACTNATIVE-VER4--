"use client"

import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"

const CancelPage = ({ navigation, route }) => {
  const { reason } = route.params || {}

  const handleRetryPayment = () => {
    navigation.navigate("Checkout")
  }

  const handleBackToCart = () => {
    navigation.navigate("Cart")
  }

  const handleBackHome = () => {
    navigation.navigate("ProductListing")
  }

  const getErrorMessage = () => {
    switch (reason) {
      case "payment_failed":
        return "Your payment could not be processed. Please check your payment details and try again."
      case "user_cancelled":
        return "You cancelled the payment process. Your items are still in your cart."
      case "timeout":
        return "The payment session has expired. Please try again."
      default:
        return "Something went wrong with your order. Please try again or contact support."
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.errorCard}>
          <View style={styles.iconContainer}>
            <View style={styles.errorIcon}>
              <Icon name="close" size={48} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.errorTitle}>Payment Cancelled</Text>
            <Text style={styles.errorSubtitle}>{getErrorMessage()}</Text>
          </View>

          <View style={styles.troubleshootContainer}>
            <Text style={styles.troubleshootTitle}>What you can do:</Text>
            <View style={styles.troubleshootItem}>
              <Icon name="credit-card" size={16} color="#6B7280" />
              <Text style={styles.troubleshootText}>Check your payment method details</Text>
            </View>
            <View style={styles.troubleshootItem}>
              <Icon name="wifi" size={16} color="#6B7280" />
              <Text style={styles.troubleshootText}>Ensure you have a stable internet connection</Text>
            </View>
            <View style={styles.troubleshootItem}>
              <Icon name="refresh" size={16} color="#6B7280" />
              <Text style={styles.troubleshootText}>Try a different payment method</Text>
            </View>
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleRetryPayment}>
              <Icon name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToCart}>
              <Icon name="shopping-cart" size={20} color="#6B7280" />
              <Text style={styles.secondaryButtonText}>Back to Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tertiaryButton} onPress={handleBackHome}>
              <Text style={styles.tertiaryButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.supportContainer}>
            <Text style={styles.supportText}>Need help?</Text>
            <TouchableOpacity style={styles.supportButton}>
              <Icon name="chat" size={16} color="#2563EB" />
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>
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
  errorCard: {
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
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  troubleshootContainer: {
    width: "100%",
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  troubleshootTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#991B1B",
    marginBottom: 12,
  },
  troubleshootItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  troubleshootText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
    flex: 1,
  },
  actionContainer: {
    width: "100%",
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: "#EF4444",
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
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  tertiaryButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  tertiaryButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "500",
  },
  supportContainer: {
    alignItems: "center",
  },
  supportText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  supportButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
})

export default CancelPage
