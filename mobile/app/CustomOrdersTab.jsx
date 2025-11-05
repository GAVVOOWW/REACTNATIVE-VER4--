import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ScrollView,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OrderDetailModal } from './components/OrderDetailModal';

const CustomOrdersTab = ({ orders, onUpdateOrderStatus, API_BASE_URL }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderDetail, setShowOrderDetail] = useState(false);

    // Helper function to get consistent order amount
    const getOrderAmount = (order) => {
        return order.totalAmount || order.amount || 0;
    };

    // Helper function to get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'On Process':
                return '#FFA500';
            case 'Delivered':
                return '#28A745';
            case 'Requesting for Refund':
                return '#DC3545';
            case 'Refunded':
                return '#6C757D';
            default:
                return '#6C757D';
        }
    };

    // Filter orders that contain customized items
    const customizedOrders = useMemo(() => {
        return orders.filter(order => {
            return order.items?.some(item => {
                // Check for custom dimensions
                return item.customH != null && item.customW != null && item.customL != null;
            });
        });
    }, [orders]);

    // Filter orders based on search and status
    const filteredOrders = useMemo(() => {
        let filtered = customizedOrders;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(order =>
                order.user?.name?.toLowerCase().includes(query) ||
                order._id.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [customizedOrders, searchQuery, statusFilter]);

    const openOrderDetail = (order) => {
        setSelectedOrder(order);
        setShowOrderDetail(true);
    };

    const closeOrderDetail = () => {
        setShowOrderDetail(false);
        setSelectedOrder(null);
    };

    const updateOrderStatusFromModal = (orderId, newStatus) => {
        onUpdateOrderStatus(orderId, newStatus);
        closeOrderDetail();
    };

    const renderStatusFilter = (status) => (
        <TouchableOpacity
            style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive
            ]}
            onPress={() => setStatusFilter(status)}
        >
            <Text style={[
                styles.filterChipText,
                statusFilter === status && styles.filterChipTextActive
            ]}>
                {status === 'all' ? 'All' : status}
            </Text>
        </TouchableOpacity>
    );

    const renderCustomOrderItem = ({ item, index }) => {
        const customItems = item.items?.filter(item => 
            item.customH != null && item.customW != null && item.customL != null
        ) || [];

        return (
            <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                    <View style={styles.orderInfo}>
                        <Text style={styles.orderId}>#{item._id.slice(-8)}</Text>
                        <Text style={styles.customerName}>{item.user?.name || 'N/A'}</Text>
                        <Text style={styles.orderDate}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={styles.orderStatus}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                            <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.customItemsSection}>
                    <Text style={styles.sectionTitle}>Custom Items:</Text>
                    {customItems.map((customItem, idx) => (
                        <View key={idx} style={styles.customItemRow}>
                            <Text style={styles.itemName}>{customItem.item?.name}</Text>
                            <Text style={styles.customDimensions}>
                                {customItem.customH} × {customItem.customW} × {customItem.customL}
                            </Text>
                            {customItem.legsFrameMaterial && (
                                <Text style={styles.materialInfo}>
                                    Frame: {customItem.legsFrameMaterial}
                                </Text>
                            )}
                            {customItem.tabletopMaterial && (
                                <Text style={styles.materialInfo}>
                                    Top: {customItem.tabletopMaterial}
                                </Text>
                            )}
                        </View>
                    ))}
                </View>

                <View style={styles.orderFooter}>
                    <Text style={styles.orderAmount}>
                        ₱{getOrderAmount(item).toLocaleString()}
                    </Text>
                    <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => openOrderDetail(item)}
                    >
                        <Text style={styles.viewButtonText}>View Details</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderCustomOrdersContent = () => {
        if (filteredOrders.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Icon name="build" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No Custom Orders</Text>
                    <Text style={styles.emptyText}>
                        {searchQuery || statusFilter !== 'all' 
                            ? 'No custom orders match your filters.'
                            : 'No customized orders found yet.'
                        }
                    </Text>
                </View>
            );
        }

        return (
            <FlatList
                data={filteredOrders}
                renderItem={renderCustomOrderItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.ordersList}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    return (
        <View style={styles.tabContainer}>
            <View style={styles.tabHeader}>
                <Text style={styles.tabTitle}>Custom Orders Management</Text>
                <Text style={styles.tabSubtitle}>
                    {customizedOrders.length} custom orders • {filteredOrders.length} filtered
                </Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Icon name="search" size={20} color="#6B7280" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by customer or order ID..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#9CA3AF"
                    />
                </View>
            </View>

            <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {renderStatusFilter('all')}
                    {renderStatusFilter('On Process')}
                    {renderStatusFilter('Delivered')}
                    {renderStatusFilter('Requesting for Refund')}
                    {renderStatusFilter('Refunded')}
                </ScrollView>
            </View>

            {renderCustomOrdersContent()}

            <OrderDetailModal
                isVisible={showOrderDetail}
                onClose={closeOrderDetail}
                selectedOrder={selectedOrder}
                onUpdateOrderStatus={updateOrderStatusFromModal}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    tabContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    tabHeader: {
        padding: 20,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6',
    },
    tabTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#343a40',
        marginBottom: 4,
    },
    tabSubtitle: {
        fontSize: 14,
        color: '#6c757d',
    },
    searchContainer: {
        padding: 15,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#343a40',
    },
    filtersContainer: {
        padding: 15,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#dee2e6',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    filterChipActive: {
        backgroundColor: '#007bff',
        borderColor: '#007bff',
    },
    filterChipText: {
        fontSize: 14,
        color: '#6c757d',
        fontWeight: '500',
    },
    filterChipTextActive: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
    ordersList: {
        padding: 15,
    },
    orderCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    orderInfo: {
        flex: 1,
    },
    orderId: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#343a40',
        marginBottom: 4,
    },
    customerName: {
        fontSize: 14,
        color: '#495057',
        marginBottom: 2,
    },
    orderDate: {
        fontSize: 12,
        color: '#6c757d',
    },
    orderStatus: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        color: '#ffffff',
        fontWeight: 'bold',
    },
    customItemsSection: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    customItemRow: {
        backgroundColor: '#F9FAFB',
        padding: 8,
        borderRadius: 6,
        marginBottom: 6,
    },
    itemName: {
        fontSize: 13,
        fontWeight: '500',
        color: '#1F2937',
        marginBottom: 2,
    },
    customDimensions: {
        fontSize: 12,
        color: '#6B7280',
        fontFamily: 'monospace',
        marginBottom: 2,
    },
    materialInfo: {
        fontSize: 11,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    orderAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007bff',
    },
    viewButton: {
        backgroundColor: '#007bff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    viewButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        marginTop: 50,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
    },
});

export default CustomOrdersTab; 