"use client"

import { useState, useEffect, useMemo } from "react"
import { API_BASE_URL } from "@env";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Image,
    Dimensions,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useLocalSearchParams, useRouter } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width } = Dimensions.get("window")

const ProductDetail = () => {
    const router = useRouter()
    const params = useLocalSearchParams()
    const { id } = params

    // Local state
    const [product, setProduct] = useState(null)
    const [productLoading, setProductLoading] = useState(true)
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [quantity, setQuantity] = useState(1)
    const [selectedColor, setSelectedColor] = useState(null)
    const [selectedSize, setSelectedSize] = useState(null)
    const [currentCartQuantity, setCurrentCartQuantity] = useState(0)
    const [isFavorite, setIsFavorite] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showCustomModal, setShowCustomModal] = useState(false)
    const [modalStep, setModalStep] = useState('input') // 'input' | 'summary'
    const [customDims, setCustomDims] = useState({ length: '', width: '', height: '' })
    const [selectedMaterial3x3, setSelectedMaterial3x3] = useState('')
    const [selectedMaterial2x12, setSelectedMaterial2x12] = useState('')
    const [laborDays, setLaborDays] = useState(0)
    const [isCalculating, setIsCalculating] = useState(false)
    const [customPriceDetails, setCustomPriceDetails] = useState(null)
    const [showAddedModal, setShowAddedModal] = useState(false)



    // Remaining stock that can still be added (product stock minus what is already in the cart)
    const availableStock = product ? Math.max(0, product.stock - currentCartQuantity) : 0

    // Calculate review summary
    const reviewSummary = useMemo(() => {
        if (!product || !product.reviews || product.reviews.length === 0) {
            return {
                averageRating: 0,
                totalReviews: 0,
            };
        }

        const totalReviews = product.reviews.length;
        const totalStars = product.reviews.reduce((sum, review) => sum + review.star, 0);
        const averageRating = totalStars / totalReviews;

        return {
            averageRating: averageRating.toFixed(1), // Format to one decimal place
            totalReviews,
        };
    }, [product]);

    // Fetch product details --------------------------------------------------
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/items/${id}`)
                const data = await res.json()

                if (res.ok && data.success) {
                    const item = data.Itemdata
                    setProduct(item)

                    if (item.colors && item.colors.length > 0) setSelectedColor(item.colors[0])
                    if (item.sizes && item.sizes.length > 0) setSelectedSize(item.sizes[0])
                } else {
                    Alert.alert("Error", data.message || "Failed to load product details.")
                    router.back()
                }
            } catch (error) {
                console.error("Fetch product error:", error)
                Alert.alert("Network Error", "Unable to load product details.")
                router.back()
            } finally {
                setProductLoading(false)
            }
        }

        if (id) fetchProduct()
    }, [id])

    // Fetch how many of this product are already in the cart ------------------
    useEffect(() => {
        const fetchCurrentCartQuantity = async () => {
            try {
                const token = await AsyncStorage.getItem('token')
                const userId = await AsyncStorage.getItem('userId')
                if (!token || !userId) return

                const res = await fetch(`${API_BASE_URL}/api/cart/${userId}/items`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                })

                const data = await res.json()
                if (res.ok && data.success && Array.isArray(data.items)) {
                    const found = data.items.find(i => i.item && i.item._id === id)
                    if (found) setCurrentCartQuantity(found.quantity)
                }
            } catch (error) {
                console.error('Error fetching cart quantity:', error)
            }
        }

        if (product) fetchCurrentCartQuantity()
    }, [product])

    const handleAddToCart = async () => {
        if (quantity > availableStock) {
            Alert.alert("Stock Limit", `Only ${availableStock} items available.`)
            return
        }

        setLoading(true)
        try {
            const token = await AsyncStorage.getItem('token')
            const userId = await AsyncStorage.getItem('userId')

            if (!token || !userId) {
                Alert.alert("Please Login", "You need to be logged in to add items to the cart.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Login", onPress: () => router.push("/Login") },
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
                    itemId: product._id,
                    quantity: quantity,
                    // You can add color and size here if your backend supports it
                }),
            })

            const data = await response.json()

            if (response.ok && data.success) {
                // silently update cart state without showing a success pop-up
                setCurrentCartQuantity(prev => prev + quantity)
                setQuantity(1)
                setShowAddedModal(true)
                setTimeout(() => setShowAddedModal(false), 100)
            } else {
                Alert.alert("Error", data.message || "Failed to add item to cart.")
            }
        } catch (error) {
            console.error("Add to cart error:", error)
            Alert.alert("Network Error", "Unable to add item to cart. Please check your connection.")
        } finally {
            setLoading(false)
        }
    }

    const handleBuyNow = () => {
        const item = { item: product, quantity, selectedColor, selectedSize }
        const subtotal = product.price * quantity
        const shipping = subtotal > 500 ? 0 : 29.99
        const tax = subtotal * 0.08
        const total = subtotal + shipping + tax
        const summary = {
            subtotal,
            discount: 0,
            shipping,
            tax,
            total,
        }

        router.push({
            pathname: "/checkout",
            params: {
                items: JSON.stringify([item]),
                summary: JSON.stringify(summary),
            },
        })
    }

    const toggleFavorite = () => {
        setIsFavorite(!isFavorite)
    }

    const handleImageScroll = (event) => {
        const slide = Math.ceil(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width)
        if (slide !== selectedImageIndex) {
            setSelectedImageIndex(slide)
        }
    }

    const renderImage = ({ item, index }) => (
        <Image source={{ uri: item }} style={styles.productImage} resizeMode="contain" />
    )

    const resetCustomModal = () => {
        setShowCustomModal(false)
        setModalStep('input')
        setCustomDims({ length: '', width: '', height: '' })
        setSelectedMaterial3x3('')
        setSelectedMaterial2x12('')
        setLaborDays(0)
        setCustomPriceDetails(null)
    }

    const handleOpenCustomize = () => {
        if (!product) return
        // prefills
        const mats = product.customization_options?.materials || []
        if (mats.length > 0) {
            setSelectedMaterial3x3(mats[0].name)
            setSelectedMaterial2x12(mats[0].name)
        }
        setLaborDays(product.customization_options?.estimated_days || 0)
        setShowCustomModal(true)
    }

    const handleCalculatePrice = async () => {
        if (!customDims.length || !customDims.width || !customDims.height) {
            Alert.alert('Invalid', 'Please enter all dimensions')
            return
        }
        setIsCalculating(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/items/${product._id}/calculate-price`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    length: parseFloat(customDims.length),
                    width: parseFloat(customDims.width),
                    height: parseFloat(customDims.height),
                    laborDays: laborDays,
                    materialName3x3: selectedMaterial3x3,
                    materialName2x12: selectedMaterial2x12,
                })
            })
            const data = await res.json()
            if (res.ok) {
                setCustomPriceDetails(data)
                setModalStep('summary')
            } else {
                Alert.alert('Error', data.message || 'Failed to calculate price')
            }
        } catch (err) {
            console.error('Price calc err', err)
            Alert.alert('Network', 'Could not calculate price')
        } finally {
            setIsCalculating(false)
        }
    }

    const handleCustomCheckout = () => {
        if (!customPriceDetails) return;

        // Create an item structure that matches what the cart and checkout expect
        const customisedItem = {
            item: product, // The full product object
            quantity: 1,
            customPrice: customPriceDetails.finalSellingPrice, // Use customPrice instead of price
            // Move custom fields to top level to match cart structure
            customH: parseFloat(customDims.height),
            customW: parseFloat(customDims.width),
            customL: parseFloat(customDims.length),
            legsFrameMaterial: selectedMaterial3x3,
            tabletopMaterial: selectedMaterial2x12,
        };

        const summary = {
            subtotal: customPriceDetails.finalSellingPrice,
            discount: 0,
            shipping: customPriceDetails.finalSellingPrice > 500 ? 0 : 29.99,
            tax: customPriceDetails.finalSellingPrice * 0.08,
            total: customPriceDetails.finalSellingPrice + (customPriceDetails.finalSellingPrice > 500 ? 0 : 29.99) + (customPriceDetails.finalSellingPrice * 0.08),
        };

        resetCustomModal();
        router.push({
            pathname: '/checkout',
            params: {
                items: JSON.stringify([customisedItem]),
                summary: JSON.stringify(summary),
            }
        });
    }

    const handleAddCustomToCart = async () => {
        if (!customPriceDetails) {
            Alert.alert("Error", "Please calculate a price before adding to cart.");
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('userId');

            if (!token || !userId) {
                Alert.alert("Please Login", "You need to be logged in to add items to the cart.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Login", onPress: () => router.push("/Login") },
                ]);
                setLoading(false);
                return;
            }

            console.log(`[CUSTOM ADD TO CART] User: ${userId}, Item: ${product._id}`);
            console.log(`[CUSTOM ADD TO CART] Dimensions: H:${customDims.height}, W:${customDims.width}, L:${customDims.length}`);

            const response = await fetch(`${API_BASE_URL}/api/cart/${userId}/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    itemId: product._id,
                    quantity: 1,
                    customH: parseFloat(customDims.height),
                    customW: parseFloat(customDims.width),
                    customL: parseFloat(customDims.length),
                    legsFrameMaterial: selectedMaterial3x3,
                    tabletopMaterial: selectedMaterial2x12,
                    customPrice: customPriceDetails.finalSellingPrice
                    // Remove customizations object, as these fields are now top-level
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setShowAddedModal(true);
                setTimeout(() => setShowAddedModal(false), 2000);
                resetCustomModal();
            } else {
                Alert.alert("Error", data.message || "Failed to add custom item to cart.");
            }
        } catch (error) {
            console.error("Add custom item to cart error:", error);
            Alert.alert("Network Error", "Unable to add custom item to cart.");
        } finally {
            setLoading(false);
        }
    };

    if (productLoading || !product) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563EB" />
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                    <Icon name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/cart')}>
                    <Icon name="shopping-cart" size={24} color="#1F2937" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Image Carousel */}
                <View style={styles.imageContainer}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleImageScroll}
                        scrollEventThrottle={16}
                    >
                        {Array.isArray(product.imageUrl) ? product.imageUrl.map((img, index) => (
                            <Image key={index} source={{ uri: img }} style={styles.productImage} resizeMode="contain" />
                        )) : (
                            <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="contain" />
                        )}
                    </ScrollView>
                    <View style={styles.pagination}>
                        {Array.isArray(product.imageUrl) && product.imageUrl.map((_, i) => (
                            <Text key={i} style={i === selectedImageIndex ? styles.paginationDotActive : styles.paginationDot}>
                                •
                            </Text>
                        ))}
                    </View>
                </View>

                <View style={styles.detailsContainer}>
                    {/* Title and Price */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.productName}>{product.name}</Text>

                    </View>
                    <Text style={styles.productPrice}>₱{(product.price || 0).toLocaleString()}</Text>

                    {/* Rating */}
                    {reviewSummary.totalReviews > 0 && (
                        <View style={styles.ratingContainer}>
                            <Icon name="star" size={16} color="#F59E0B" />
                            <Text style={styles.ratingText}>
                                {reviewSummary.averageRating} ({reviewSummary.totalReviews} review{reviewSummary.totalReviews > 1 ? 's' : ''})
                            </Text>
                        </View>
                    )}

                    {/* Quantity */}
                    <View style={styles.optionContainer}>
                        <Text style={styles.optionLabel}>Quantity</Text>
                        <View style={styles.quantitySelector}>
                            <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                            >
                                <Icon name="remove" size={18} color="#6B7280" />
                            </TouchableOpacity>
                            <Text style={styles.quantityValue}>{quantity}</Text>
                            <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => setQuantity(prev => Math.min(prev + 1, availableStock))}
                            >
                                <Icon name="add" size={18} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Colors */}
                    {product.colors && product.colors.length > 0 && (
                        <View style={styles.optionContainer}>
                            <Text style={styles.optionLabel}>Color</Text>
                            <View style={styles.colorSelector}>
                                {product.colors.map((color, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: color.toLowerCase() },
                                            selectedColor === color && styles.colorOptionSelected,
                                        ]}
                                        onPress={() => setSelectedColor(color)}
                                    />
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Sizes */}
                    {product.sizes && product.sizes.length > 0 && (
                        <View style={styles.optionContainer}>
                            <Text style={styles.optionLabel}>Size</Text>
                            <View style={styles.sizeSelector}>
                                {product.sizes.map((size, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.sizeOption,
                                            selectedSize === size && styles.sizeOptionSelected,
                                        ]}
                                        onPress={() => setSelectedSize(size)}
                                    >
                                        <Text
                                            style={[
                                                styles.sizeText,
                                                selectedSize === size && styles.sizeTextSelected,
                                            ]}
                                        >
                                            {size}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Description */}
                    <View style={styles.descriptionContainer}>
                        <Text style={styles.descriptionTitle}>Description</Text>
                        <Text style={styles.descriptionText}>
                            {product.description}
                        </Text>
                    </View>

                    {/* Reviews Section */}
                    <View style={styles.reviewsContainer}>
                        <Text style={styles.reviewsTitle}>Customer Reviews</Text>
                        {reviewSummary.totalReviews > 0 ? (
                            product.reviews.map((review, index) => (
                                <View key={index} style={styles.reviewItem}>
                                    <View style={styles.reviewHeader}>
                                        <Text style={styles.reviewAuthor}>{review.userName || 'Anonymous'}</Text>
                                        <View style={styles.reviewStars}>
                                            {[...Array(5)].map((_, i) => (
                                                <Icon
                                                    key={i}
                                                    name="star"
                                                    size={14}
                                                    color={i < review.star ? "#F59E0B" : "#D1D5DB"}
                                                />
                                            ))}
                                        </View>
                                    </View>
                                    <Text style={styles.reviewText}>{review.description}</Text>
                                    <Text style={styles.reviewDate}>
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.reviewText}>Be the first to review this product!</Text>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                {product.is_customizable && (
                    <TouchableOpacity
                        style={[styles.addToCartButton, { borderColor: '#10b981' }]}
                        onPress={handleOpenCustomize}
                    >
                        <Icon name="build" size={24} color="#10b981" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.addToCartButton}
                    onPress={handleAddToCart}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#2563EB" size="small" />
                    ) : (
                        <Icon name="add-shopping-cart" size={24} color="#2563EB" />
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.buyNowButton}
                    onPress={handleBuyNow}
                    disabled={loading}
                >
                    <Text style={styles.buyNowText}>Buy Now</Text>
                </TouchableOpacity>
            </View>

            {/* Customisation Modal */}
            <Modal
                visible={showCustomModal}
                animationType="slide"
                transparent={true}
                onRequestClose={resetCustomModal}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}>
                    <View style={{ margin: 16, backgroundColor: '#fff', borderRadius: 8, padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                                {modalStep === 'input' ? `Customize Your ${product.name}` : 'Your Custom Quote'}
                            </Text>
                            <TouchableOpacity onPress={resetCustomModal}><Icon name="close" size={24} /></TouchableOpacity>
                        </View>

                        {modalStep === 'input' ? (
                            <>
                                <Text style={{ marginVertical: 8 }}>Enter dimensions (ft)</Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <TextInput
                                        placeholder="Length (2-10)"
                                        style={{ borderWidth: 1, flex: 1, marginRight: 4, padding: 8, borderRadius: 4 }}
                                        keyboardType="numeric"
                                        value={customDims.length}
                                        onChangeText={(t) => {
                                            const value = parseFloat(t);
                                            if (t === '' || (value >= 2 && value <= 10)) {
                                                setCustomDims({ ...customDims, length: t });
                                            }
                                        }}
                                    />
                                    <TextInput
                                        placeholder="Width (2-6)"
                                        style={{ borderWidth: 1, flex: 1, marginHorizontal: 2, padding: 8, borderRadius: 4 }}
                                        keyboardType="numeric"
                                        value={customDims.width}
                                        onChangeText={(t) => {
                                            const value = parseFloat(t);
                                            if (t === '' || (value >= 2 && value <= 6)) {
                                                setCustomDims({ ...customDims, width: t });
                                            }
                                        }}
                                    />
                                    <TextInput
                                        placeholder="Height (2.5-5)"
                                        style={{ borderWidth: 1, flex: 1, marginLeft: 4, padding: 8, borderRadius: 4 }}
                                        keyboardType="numeric"
                                        value={customDims.height}
                                        onChangeText={(t) => {
                                            const value = parseFloat(t);
                                            if (t === '' || (value >= 2.5 && value <= 5)) {
                                                setCustomDims({ ...customDims, height: t });
                                            }
                                        }}
                                    />
                                </View>

                                <Text style={{ marginTop: 12 }}>Material for Legs / Frame (3×3)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                                    {product.customization_options?.materials?.map((mat) => (
                                        <TouchableOpacity
                                            key={mat.name}
                                            onPress={() => setSelectedMaterial3x3(mat.name)}
                                            style={{
                                                padding: 8,
                                                backgroundColor: selectedMaterial3x3 === mat.name ? '#2563EB' : '#F3F4F6',
                                                borderRadius: 6,
                                                marginRight: 8,
                                            }}
                                        >
                                            <Text style={{ color: selectedMaterial3x3 === mat.name ? '#fff' : '#1F2937' }}>{mat.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={{ marginTop: 12 }}>Material for Tabletop (2×12)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                                    {product.customization_options?.materials?.map((mat) => (
                                        <TouchableOpacity
                                            key={mat.name + '2'}
                                            onPress={() => setSelectedMaterial2x12(mat.name)}
                                            style={{
                                                padding: 8,
                                                backgroundColor: selectedMaterial2x12 === mat.name ? '#2563EB' : '#F3F4F6',
                                                borderRadius: 6,
                                                marginRight: 8,
                                            }}
                                        >
                                            <Text style={{ color: selectedMaterial2x12 === mat.name ? '#fff' : '#1F2937' }}>{mat.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={{ marginTop: 12 }}>Estimated Labor Days: {laborDays}</Text>

                                <TouchableOpacity
                                    style={{ backgroundColor: '#2563EB', padding: 12, borderRadius: 8, marginTop: 16, alignItems: 'center' }}
                                    onPress={handleCalculatePrice}
                                    disabled={isCalculating}
                                >
                                    {isCalculating ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Calculate Price</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            customPriceDetails && (
                                <>
                                    <Text style={{ marginTop: 8 }}>
                                        Dimensions: {customDims.length}×{customDims.width}×{customDims.height} ft
                                    </Text>
                                    <Text>Leg Material: {selectedMaterial3x3}</Text>
                                    <Text>Top Material: {selectedMaterial2x12}</Text>
                                    <Text style={{ marginTop: 8 }}>Estimated Price:</Text>
                                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#2563EB' }}>
                                        ₱{customPriceDetails.finalSellingPrice.toFixed(2)}
                                    </Text>
                                    <Text>Completion in {laborDays} days</Text>

                                    <View style={{ flexDirection: 'row', marginTop: 16, justifyContent: 'space-between' }}>
                                        <TouchableOpacity
                                            style={{ backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center', flex: 1, marginRight: 8 }}
                                            onPress={handleAddCustomToCart}
                                            disabled={loading}
                                        >
                                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add to Cart</Text>}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{ backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center', flex: 1 }}
                                            onPress={handleCustomCheckout}
                                        >
                                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Checkout Now</Text>
                                        </TouchableOpacity>


                                    </View>
                                </>
                            )
                        )}
                    </View>
                </View>
            </Modal>

            {/* Added-to-Cart Toast Modal */}
            <Modal transparent animationType="fade" visible={showAddedModal}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="check-circle" size={24} color="#10b981" style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>Added to cart</Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerButton: {
        padding: 4,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginHorizontal: 8,
    },
    imageContainer: {
        width: width,
        height: width,
        position: 'relative',
    },
    productImage: {
        width: width,
        height: width,
    },
    pagination: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 16,
        alignSelf: 'center',
    },
    paginationDot: {
        color: '#D1D5DB',
        fontSize: 24,
        marginHorizontal: 4,
    },
    paginationDotActive: {
        color: '#2563EB',
        fontSize: 24,
        marginHorizontal: 4,
    },
    detailsContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -20,
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    productName: {
        flex: 1,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    favoriteButton: {
        padding: 8,
        marginLeft: 16,
    },
    productPrice: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2563EB',
        marginBottom: 16,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    ratingText: {
        marginLeft: 4,
        fontSize: 14,
        color: '#6B7280',
    },
    optionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
    },
    quantitySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
    },
    quantityButton: {
        padding: 12,
    },
    quantityValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        paddingHorizontal: 16,
    },
    colorSelector: {
        flexDirection: 'row',
    },
    colorOption: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginHorizontal: 4,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        borderColor: '#2563EB',
    },
    sizeSelector: {
        flexDirection: 'row',
    },
    sizeOption: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        marginHorizontal: 4,
    },
    sizeOptionSelected: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    sizeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    sizeTextSelected: {
        color: '#FFFFFF',
    },
    descriptionContainer: {
        marginTop: 16,
    },
    descriptionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#6B7280',
    },
    reviewsContainer: {
        marginTop: 24,
        paddingHorizontal: 16, // Match detailsContainer padding
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 24,
    },
    reviewsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 16,
    },
    reviewItem: {
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 16,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reviewAuthor: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
    },
    reviewStars: {
        flexDirection: 'row',
    },
    reviewText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#6B7280',
    },
    reviewDate: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 8,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    addToCartButton: {
        borderWidth: 2,
        borderColor: '#2563EB',
        borderRadius: 8,
        padding: 14,
        marginRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buyNowButton: {
        flex: 1,
        backgroundColor: '#2563EB',
        borderRadius: 8,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buyNowText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
})

export default ProductDetail
