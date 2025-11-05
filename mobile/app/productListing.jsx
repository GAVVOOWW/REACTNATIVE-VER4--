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
    Image,
    Dimensions,
    Modal,
    TouchableWithoutFeedback,
    ActivityIndicator,
    Alert,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width } = Dimensions.get("window")
const itemWidth = (width - 48) / 2 // 2 columns with padding

const ProductListing = () => {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("All")
    const [viewMode, setViewMode] = useState("grid") // 'grid' or 'list'
    const [menuVisible, setMenuVisible] = useState(false)
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState(["All"])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [userRole, setUserRole] = useState(null)

  

    useEffect(() => {
        fetchProducts()
        fetchCategories()
        getUserRole()
    }, [])

    const getUserRole = async () => {
        try {
            const role = await AsyncStorage.getItem('userRole')
            setUserRole(role)
        } catch (error) {
            console.error('Error getting user role:', error)
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

    const fetchProducts = async () => {
        try {
            console.log("Fetching products from:", `${API_BASE_URL}/api/items`)

            const response = await fetch(`${API_BASE_URL}/api/items`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            console.log("Products response status:", response.status)
            const data = await response.json()

            if (response.ok && data.success) {
                console.log("Products fetched successfully:", data.ItemData.length, "items")
                // Shuffle the array for a random initial display order
                const shuffled = data.ItemData.sort(() => 0.5 - Math.random())
                setProducts(shuffled)
            } else {
                console.error("Failed to fetch products:", data.message)
                Alert.alert("Error", data.message || "Failed to fetch products")
            }
        } catch (error) {
            console.error("Error fetching products:", error)
            Alert.alert("Network Error", "Unable to fetch products. Please check your connection.")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/categories`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const data = await response.json()
            if (response.ok && data.success) {
                const categoryNames = data.CategoryData.map(cat => cat.name)
                setCategories(["All", ...categoryNames])
            }
        } catch (error) {
            console.error("Error fetching categories:", error)
        }
    }

    const onRefresh = () => {
        setRefreshing(true)
        fetchProducts()
    }

    const filteredProducts = products.filter((product) => {
        // Support items that have one or multiple categories populated
        const categoryArray = Array.isArray(product.category)
            ? product.category
            : product.category
                ? [product.category]
                : []

        const categoryNamesLower = categoryArray
            .map((cat) => cat?.name?.toLowerCase())
            .filter(Boolean)

        const lowerQuery = searchQuery.toLowerCase()

        // Search may match name, description, or category name
        const matchesSearch =
            product.name.toLowerCase().includes(lowerQuery) ||
            product.description?.toLowerCase().includes(lowerQuery) ||
            categoryNamesLower.some((catName) => catName.includes(lowerQuery))

        const matchesCategory =
            selectedCategory === "All" ||
            categoryNamesLower.includes(selectedCategory.toLowerCase())

        return matchesSearch && matchesCategory
    })

    const navigateToProduct = (product) => {
        router.push({
            pathname: "/productDetails",
            params: { id: product._id },
        })
    }

    const navigateToCart = () => {
        router.push("/cart")
    }

    const navigateToProfile = () => {
        router.push("/UserProfile")
    }

    const logout = async () => {
        try {
            await AsyncStorage.multiRemove(['token', 'userId', 'userRole'])
            router.push("/Login")
        } catch (error) {
            console.error("Error during logout:", error)
        }
    }

    const isAdmin = userRole === 'admin'

    const menuItems = [
        { icon: "person", label: "User Profile", onPress: () => { setMenuVisible(false); navigateToProfile(); } },
        { icon: "history", label: "Order History", onPress: () => { setMenuVisible(false); router.push("/OrderHistory"); } },
        { icon: "recommend", label: "Recommendations", onPress: () => { setMenuVisible(false); router.push("/RecommendationPage"); } },
        // Only show Chat Support for non-admin users
        ...(isAdmin ? [] : [{ icon: "chat", label: "Chat Support", onPress: () => { setMenuVisible(false); router.push("/ChatPage"); } }]),
        // Only show Admin Panel for admin users
        ...(isAdmin ? [{ icon: "admin-panel-settings", label: "Admin Panel", onPress: () => { setMenuVisible(false); router.push("/AdminPage"); } }] : []),
        { icon: "logout", label: "Logout", onPress: () => { setMenuVisible(false); logout(); } },
    ]

    const renderGridItem = ({ item }) => {
        // Calculate average rating and total reviews
        const totalReviews = item.reviews?.length || 0;
        const averageRating = totalReviews > 0 
            ? (item.reviews.reduce((sum, review) => sum + review.star, 0) / totalReviews).toFixed(1)
            : 0;

        return (
            <TouchableOpacity style={styles.gridItem} onPress={() => navigateToProduct(item)}>
                <Image
                    source={{ uri: Array.isArray(item.imageUrl) ? item.imageUrl[0] : item.imageUrl }}
                    style={styles.gridItemImage}
                    resizeMode="contain"
                />
                <View style={styles.gridItemInfo}>
                    <Text style={styles.gridItemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.gridItemPrice}>₱{item.price?.toLocaleString()}</Text>
                    
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

                    {item.is_bestseller && (
                        <View style={styles.bestsellerBadge}>
                            <Text style={styles.bestsellerText}>Bestseller</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    }

    const renderListItem = ({ item }) => {
        // Calculate average rating and total reviews
        const totalReviews = item.reviews?.length || 0;
        const averageRating = totalReviews > 0 
            ? (item.reviews.reduce((sum, review) => sum + review.star, 0) / totalReviews).toFixed(1)
            : 0;

        return (
            <TouchableOpacity style={styles.listItem} onPress={() => navigateToProduct(item)}>
                <Image
                    source={{ uri: Array.isArray(item.imageUrl) ? item.imageUrl[0] : item.imageUrl }}
                    style={styles.listItemImage}
                    resizeMode="contain"
                />
                <View style={styles.listItemInfo}>
                    <View style={styles.listItemHeader}>
                        <Text style={styles.listItemName}>{item.name}</Text>
                        {item.is_bestseller && (
                            <View style={styles.bestsellerBadge}>
                                <Text style={styles.bestsellerText}>Bestseller</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.listItemDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                    <Text style={styles.listItemPrice}>₱{item.price?.toLocaleString()}</Text>
                    
                    {/* Rating and Sales Info */}
                    <View style={styles.listItemStats}>
                        {averageRating > 0 && (
                            <View style={styles.ratingContainer}>
                                <Icon name="star" size={14} color="#F59E0B" />
                                <Text style={styles.ratingText}>{averageRating}</Text>
                                <Text style={styles.reviewCount}>({totalReviews})</Text>
                            </View>
                        )}
                        {item.sales > 0 && (
                            <Text style={styles.salesText}>{item.sales} sold</Text>
                        )}
                    </View>
                    
                    <Text style={styles.listItemStock}>
                        {item.stock > 0 ? `${item.stock} in stock` : "Out of stock"}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Loading products...</Text>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <Icon name="menu" size={24} color="#1F2937" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Wawa Furniture</Text>

                <TouchableOpacity onPress={navigateToCart}>
                    <Icon name="shopping-cart" size={24} color="#1F2937" />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search products..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Filters and View Mode */}
            <View style={styles.filtersContainer}>
                <View style={styles.categoriesContainer}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={categories}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.categoryChip,
                                    selectedCategory === item && styles.categoryChipActive,
                                ]}
                                onPress={() => setSelectedCategory(item)}
                            >
                                <Text
                                    style={[
                                        styles.categoryChipText,
                                        selectedCategory === item && styles.categoryChipTextActive,
                                    ]}
                                >
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                <View style={styles.viewModeContainer}>
                    <TouchableOpacity
                        style={[styles.viewModeButton, viewMode === "grid" && styles.viewModeButtonActive]}
                        onPress={() => setViewMode("grid")}
                    >
                        <Icon name="grid-view" size={20} color={viewMode === "grid" ? "#FFFFFF" : "#6B7280"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.viewModeButton, viewMode === "list" && styles.viewModeButtonActive]}
                        onPress={() => setViewMode("list")}
                    >
                        <Icon name="view-list" size={20} color={viewMode === "list" ? "#FFFFFF" : "#6B7280"} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Products List */}
            {filteredProducts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Icon name="inventory-2" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No Products Found</Text>
                    <Text style={styles.emptyText}>
                        {searchQuery || selectedCategory !== "All"
                            ? "Try adjusting your search or filters"
                            : "No products available at the moment"}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item._id}
                    numColumns={viewMode === "grid" ? 2 : 1}
                    key={viewMode} // Force re-render when view mode changes
                    renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
                    contentContainerStyle={styles.productsList}
                    onRefresh={onRefresh}
                    refreshing={refreshing}
                />
            )}

            {/* Sidebar Menu Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={menuVisible}
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.sidebarMenu}>
                                <View style={styles.sidebarHeader}>
                                    <Text style={styles.sidebarTitle}>Menu</Text>
                                    <TouchableOpacity onPress={() => setMenuVisible(false)}>
                                        <Icon name="close" size={24} color="#1F2937" />
                                    </TouchableOpacity>
                                </View>

                                {menuItems.map((item, index) => (
                                    <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
                                        <Icon name={item.icon} size={24} color="#6B7280" />
                                        <Text style={styles.menuItemText}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
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
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1F2937",
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    categoriesContainer: {
        flex: 1,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    categoryChipActive: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB",
    },
    categoryChipText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    categoryChipTextActive: {
        color: "#FFFFFF",
    },
    viewModeContainer: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 4,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    viewModeButton: {
        padding: 8,
        borderRadius: 4,
    },
    viewModeButtonActive: {
        backgroundColor: "#2563EB",
    },
    productsList: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    gridItem: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        marginBottom: 16,
        marginHorizontal: 4,
        width: itemWidth,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    gridItemImage: {
        width: "100%",
        height: 120,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    gridItemInfo: {
        padding: 12,
    },
    gridItemName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    gridItemPrice: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#2563EB",
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
    listItem: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        flexDirection: "row",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    listItemImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 12,
    },
    listItemInfo: {
        flex: 1,
    },
    listItemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 4,
    },
    listItemName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        flex: 1,
    },
    listItemDescription: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 8,
    },
    listItemPrice: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#2563EB",
        marginBottom: 4,
    },
    listItemStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    listItemStock: {
        fontSize: 12,
        color: "#6B7280",
    },
    bestsellerBadge: {
        backgroundColor: "#F59E0B",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    bestsellerText: {
        fontSize: 10,
        color: "#FFFFFF",
        fontWeight: "600",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    sidebarMenu: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingVertical: 20,
        maxHeight: "80%",
    },
    sidebarHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    sidebarTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1F2937",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    menuItemText: {
        marginLeft: 16,
        fontSize: 16,
        color: "#1F2937",
    },
})

export default ProductListing
