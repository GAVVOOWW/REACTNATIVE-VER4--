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
  TextInput,
  ToastAndroid,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'

// The sample used axios, but we will stick to fetch to avoid adding a new dependency.

const RecommendationPage = () => {
  const router = useRouter()

  // State Management
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [initialItems, setInitialItems] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [loading, setLoading] = useState(true) // Start true for initial fetch
  const [error, setError] = useState(null)
  const [wishlist, setWishlist] = useState(new Set())
  const [searchAnalysis, setSearchAnalysis] = useState(null)

  

  // Fetch initial random products on mount
  useEffect(() => {
    const fetchInitialItems = async () => {
      try {
        console.log("Fetching initial random items...")
        const response = await fetch(`${API_BASE_URL}/api/items`)
        const data = await response.json()

        if (response.ok && data.success && Array.isArray(data.ItemData)) {
          // Shuffle the array and take a selection for display
          const shuffled = data.ItemData.sort(() => 0.5 - Math.random())
          setInitialItems(shuffled.slice(0, 20)) // Show up to 20 random items
        } else {
          throw new Error(data.message || 'Failed to fetch initial items.')
        }
      } catch (e) {
        setError('Failed to load products. Please try again later.')
        console.error("Initial items fetch error:", e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialItems()
  }, [])

  // API Functions
  const getAuthToken = async () => {
    try {
      return await AsyncStorage.getItem('token')
    } catch (error) {
      console.error("Error getting auth token:", error)
      return null
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setHasSearched(true) // Treat empty search as a search action
      return
    }
    setLoading(true)
    setError(null)
    setHasSearched(true)
    try {
      console.log(`Searching for: ${searchQuery}`)
      const response = await fetch(`${API_BASE_URL}/api/items/semantic-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 20, // You can make this dynamic
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('Search response:', data.ItemData)
        setSearchResults(data.ItemData || [])
        // Store the AI analysis if available
        if (data.analysis) {
          setSearchAnalysis(data.analysis)
        }
      } else {
        throw new Error(data.message || 'Failed to fetch search results.')
      }

    } catch (e) {
      setError('Failed to fetch search results.')
      console.error("Search API error:", e.message)
    } finally {
      setLoading(false)
    }
  }

  // When search input is changed, revert to initial state if cleared
  const handleQueryChange = (text) => {
    setSearchQuery(text)
    if (text.trim() === '') {
      setHasSearched(false)
      setSearchResults([])
      setSearchAnalysis(null)
    }
  }

  // Event Handlers
  const handleQuickAdd = async (item) => {
    try {
      const token = await getAuthToken()
      const userId = await AsyncStorage.getItem('userId')

      if (!token || !userId) {
        Alert.alert("Please Login", "You need to login to add items to cart", [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => router.push("/Login") }
        ])
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/cart/${userId}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId: item._id,
          quantity: 1
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        Alert.alert("Added to Cart", `${item.name} has been added to your cart`, [
          { text: "Continue Shopping", style: "cancel" },
          { text: "View Cart", onPress: () => router.push("/cart") },
        ])
      } else {
        Alert.alert("Error", data.message || "Failed to add item to cart")
      }
    } catch (error) {
      console.error("Error adding to cart:", error)
      Alert.alert("Network Error", "Unable to add item to cart")
    }
  }

  const handleViewProduct = (item) => {
    router.push({
      pathname: "/productDetails",
      params: { id: item._id }
    })
  }

  const toggleWishlist = (itemId, itemName) => {
    setWishlist(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
        ToastAndroid.show(`${itemName} removed from wishlist`, ToastAndroid.SHORT)
      } else {
        newSet.add(itemId)
        ToastAndroid.show(`${itemName} added to wishlist`, ToastAndroid.SHORT)
      }
      return newSet
    })
  }

  // Render Components
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
        <Icon name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>AI Recommendations</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={() => router.push("/cart")} style={styles.headerButton}>
          <Icon name="shopping-cart" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderSearchBox = () => (
    <View style={styles.searchBoxContainer}>
      <TextInput
        style={styles.input}
        placeholder="Ask our AI... (e.g., 'a wooden table for my office')"
        value={searchQuery}
        onChangeText={handleQueryChange}
        onSubmitEditing={handleSearch} // Allows searching by pressing "return" on keyboard
        placeholderTextColor="#9CA3AF"
      />
      <TouchableOpacity style={styles.button} onPress={handleSearch} disabled={loading}>
        <Text style={styles.buttonText}>Search</Text>
      </TouchableOpacity>
    </View>
  )

  const renderSearchSummary = () => {
    if (!hasSearched || !searchAnalysis || searchResults.length === 0) {
      return null
    }

    return (
      <View style={styles.searchSummaryContainer}>
        <View style={styles.summaryHeader}>
          <Icon name="psychology" size={16} color="#3B82F6" />
          <Text style={styles.summaryTitle}>AI Analysis</Text>
        </View>
        <Text style={styles.summaryText}>
          {searchAnalysis.reasoning || "Here are items that match your search criteria."}
        </Text>
        {searchAnalysis.detectedRoom && (
          <Text style={styles.summarySubtext}>
            Detected room type: {searchAnalysis.detectedRoom}
          </Text>
        )}
      </View>
    )
  }

  const renderProductItem = ({ item }) => {
    // Calculate average rating and total reviews
    const totalReviews = item.reviews?.length || 0;
    const averageRating = totalReviews > 0 
      ? (item.reviews.reduce((sum, review) => sum + review.star, 0) / totalReviews).toFixed(1)
      : 0;

    return (
      <View style={styles.productCard}>
        <TouchableOpacity onPress={() => handleViewProduct(item)}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: (Array.isArray(item.imageUrl) && item.imageUrl[0]) || 'https://placehold.co/400x400?text=No+Image' }}
              style={styles.productImage}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>

        <View style={styles.productInfo}>
          <TouchableOpacity onPress={() => handleViewProduct(item)}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.productPrice}>₱{item.price?.toLocaleString()}</Text>
            
            {/* Rating and Sales Info */}
            <View style={styles.productStats}>
              {averageRating > 0 && (
                <View style={styles.ratingContainer}>
                  <Icon name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{averageRating}</Text>
                  <Text style={styles.reviewCount}>({totalReviews})</Text>
                </View>
              )}
              {item.sales > 0 && (
                <Text style={styles.salesText}>{item.sales} sold</Text>
              )}
            </View>

            {/* AI Explanation - Show only for search results */}
            {hasSearched && item.aiExplanation && (
              <View style={styles.explanationContainer}>
                <Icon name="lightbulb" size={12} color="#3B82F6" />
                <Text style={styles.explanationText}>
                  {item.aiExplanation}
                </Text>
              </View>
            )}

            {item.score && (
              <Text style={styles.itemScore}>Relevance: {item.score.toFixed(4)}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addToCartButton}
            onPress={() => handleQuickAdd(item)}
          >
            <Icon name="add-shopping-cart" size={16} color="#FFFFFF" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderListEmpty = () => {
    // This component shows when the data list is empty.
    // We check if a search has been performed to show the correct message.
    if (hasSearched) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search-off" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyText}>Try a different search, or check your spelling.</Text>
        </View>
      )
    }
    // This will show if the initial fetch returns no items.
    return (
      <View style={styles.emptyContainer}>
        <Icon name="sentiment-dissatisfied" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Products Available</Text>
        <Text style={styles.emptyText}>We couldn't find any products to show you right now.</Text>
      </View>
    )
  }

  const displayData = hasSearched ? searchResults : initialItems

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderSearchBox()}
      {renderSearchSummary()}

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={displayData}
          renderItem={renderProductItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.productsList}
          ListEmptyComponent={renderListEmpty}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  searchBoxContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: "#1F2937",
  },
  button: {
    marginLeft: 10,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchSummaryContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 6,
  },
  summaryText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    color: 'red',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
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
    lineHeight: 24,
  },
  productsList: {
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    width: "48%",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: 140,
  },
  wishlistButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 6,
    borderRadius: 20,
  },
  productInfo: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3B82F6",
    marginBottom: 4,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 2,
  },
  reviewCount: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 2,
  },
  salesText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  itemScore: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  addToCartText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  explanationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 4,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  explanationText: {
    fontSize: 12,
    color: '#1E40AF',
    marginLeft: 4,
    flexShrink: 1,
    fontWeight: '500',
  },
})

export default RecommendationPage