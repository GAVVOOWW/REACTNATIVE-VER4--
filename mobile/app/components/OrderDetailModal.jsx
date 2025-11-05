import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    TextInput,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export const OrderDetailModal = ({ isVisible, onClose, selectedOrder, onUpdateOrderStatus }) => {
    if (!isVisible || !selectedOrder) return null;

    const ORDER_STATUSES = ['On Process',           // For delivery after payment
      'Ready for Pickup',     // For pickup after payment
      'Delivered',            // For delivery after proof
      'Picked Up',            // For pickup after proof
      'Cancelled',
      'Requesting for Refund',
      'Refunded'];

    const REMARK_REQUIRED_STATUSES = ['Cancelled', 'Refunded'];
    const [showRemarkInput, setShowRemarkInput] = React.useState(false);
    const [pendingStatus, setPendingStatus] = React.useState(null);
    const [remarks, setRemarks] = React.useState('');

    const renderOrderItem = (item, index) => (
        <View key={index} style={styles.modalOrderItem}>
            <View style={styles.modalOrderItemHeader}>
                <Text style={styles.modalOrderItemName}>{item.item?.name || 'Product Name'}</Text>
                <Text style={styles.modalOrderItemPrice}>₱{Number(item.price || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.modalOrderItemDetails}>
                <Text style={styles.modalOrderItemQuantity}>Quantity: {item.quantity}</Text>
                <Text style={styles.modalOrderItemTotal}>Total: ₱{Number((item.price || 0) * (item.quantity || 1)).toLocaleString()}</Text>
            </View>
        </View>
    );

    const modalSections = [
        {
            id: 'order-info',
            title: 'Order Information',
            type: 'info',
            data: [
                { label: 'Order ID:', value: `#${selectedOrder._id.slice(-6)}` },
                { label: 'Date:', value: new Date(selectedOrder.createdAt).toLocaleDateString() },
                { label: 'Status:', value: selectedOrder.status, isStatus: true },
                ...(selectedOrder.remarks && selectedOrder.remarks.trim() ? [
                    { label: 'Remarks:', value: selectedOrder.remarks }
                ] : [])
            ]
        },
        {
            id: 'customer-info',
            title: 'Customer Information',
            type: 'info',
            data: [
                { label: 'Name:', value: selectedOrder.user?.name || 'N/A' },
                { label: 'Email:', value: selectedOrder.user?.email || 'N/A' },
                { label: 'Phone:', value: selectedOrder.phone || 'N/A' }
            ]
        },
        {
            id: 'shipping-address',
            title: 'Shipping Address',
            type: 'address',
            data: selectedOrder
        },

        {
            id: 'order-items',
            title: 'Order Items',
            type: 'items',
            data: selectedOrder.items || []
        },

        {
            id: 'order-summary',
            title: 'Order Summary',
            type: 'summary',
            data: (selectedOrder.totalAmount || selectedOrder.amount || 0)
        }
    ];

    const renderModalSection = ({ item: section }) => {
        switch (section.type) {
            case 'info':
                return (
                    <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>{section.title}</Text>
                        {section.data.map((info, index) => (
                            <View key={index} style={styles.modalInfoRow}>
                                <Text style={styles.modalInfoLabel}>{info.label}</Text>
                                {info.isStatus ? (
                                    <View style={styles.statusCheckboxContainer}>
                                        {ORDER_STATUSES.map((status) => (
                                            <TouchableOpacity
                                                key={status}
                                                style={styles.statusCheckboxItem}
                                                onPress={() => {
                                                    if (REMARK_REQUIRED_STATUSES.includes(status)) {
                                                        setPendingStatus(status);
                                                        setShowRemarkInput(true);
                                                    } else {
                                                        onUpdateOrderStatus(selectedOrder._id, status);
                                                    }
                                                }}
                                            >
                                                <Icon
                                                    name={selectedOrder.status === status ? 'check-box' : 'check-box-outline-blank'}
                                                    size={18}
                                                    color="#007bff"
                                                />
                                                <Text style={styles.statusCheckboxLabel}>{status}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={styles.modalInfoValue}>{info.value}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                );

            case 'address':
                const order = section.data;
                const userAddress = order?.user?.address;
                const addressLines = [];

                if (userAddress?.fullName || order?.user?.name) {
                    addressLines.push(userAddress?.fullName || order?.user?.name);
                }
                if (userAddress?.addressLine1 || order?.address) {
                    addressLines.push(userAddress?.addressLine1 || order?.address);
                }
                if (userAddress?.addressLine2) {
                    addressLines.push(userAddress.addressLine2);
                }
                if (userAddress?.brgyName) {
                    addressLines.push(userAddress.brgyName);
                }
                if (userAddress?.cityName && userAddress?.provinceName) {
                    addressLines.push(`${userAddress.cityName}, ${userAddress.provinceName}`);
                }
                if (userAddress?.postalCode) {
                    addressLines.push(userAddress.postalCode);
                }
                if (order?.user?.phone || order?.phone) {
                    addressLines.push(`Phone: ${order?.user?.phone || order?.phone}`);
                }

                const formattedAddress = addressLines.length > 0 ? addressLines.join('\n') : 'Address not provided';

                return (
                    <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>{section.title}</Text>
                        <Text style={styles.modalAddressText}>{formattedAddress}</Text>
                    </View>
                );

            case 'items':
                return (
                    <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>{section.title}</Text>
                        {section.data.map((item, index) => renderOrderItem(item, index))}
                    </View>
                );

            case 'summary':
                return (
                    <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>{section.title}</Text>
                        <View style={styles.modalSummaryRow}>
                            <Text style={styles.modalSummaryLabel}>Total Amount:</Text>
                            <Text style={styles.modalSummaryValue}>₱{Number(section.data || 0).toLocaleString()}</Text>
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Order Details</Text>
                        <TouchableOpacity
                            onPress={() => {
                                if (showRemarkInput && !remarks.trim()) {
                                    Alert.alert('Remarks Required', 'Please enter remarks before closing');
                                } else {
                                    onClose();
                                }
                            }}
                            style={styles.modalCloseButton}
                        >
                            <Icon name="close" size={24} color="#6c757d" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={modalSections}
                        renderItem={renderModalSection}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.modalBody}
                    />

                    {showRemarkInput && (
                        <View style={styles.remarksContainer}>
                            <Text style={styles.remarksLabel}>Remarks *</Text>
                            <TextInput
                                style={styles.remarksInput}
                                value={remarks}
                                onChangeText={setRemarks}
                                placeholder="Enter remarks"
                                multiline
                            />
                            <View style={styles.remarksButtons}>
                                <TouchableOpacity
                                    style={[styles.remarksButton, styles.remarksCancelButton]}
                                    onPress={() => {
                                        setShowRemarkInput(false);
                                        setPendingStatus(null);
                                        setRemarks('');
                                    }}
                                >
                                    <Text style={styles.remarksCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.remarksButton, styles.remarksSubmitButton]}
                                    onPress={() => {
                                        if (!remarks.trim()) {
                                            Alert.alert('Remarks Required', 'Please enter remarks.');
                                            return;
                                        }
                                        onUpdateOrderStatus(selectedOrder._id, pendingStatus, remarks.trim());
                                        setShowRemarkInput(false);
                                        setPendingStatus(null);
                                        setRemarks('');
                                    }}
                                >
                                    <Text style={styles.remarksSubmitButtonText}>Submit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        width: '90%',
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f5',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#343a40',
    },
    modalCloseButton: {
        padding: 5,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
    },
    modalBody: {
        paddingHorizontal: 20,
    },
    modalSection: {
        marginBottom: 25,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f5',
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#343a40',
        marginBottom: 12,
    },
    modalInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalInfoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6c757d',
        flex: 1,
    },
    modalInfoValue: {
        fontSize: 14,
        color: '#343a40',
        flex: 2,
        textAlign: 'right',
    },
    modalOrderItem: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    modalOrderItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    modalOrderItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#343a40',
        flex: 2,
    },
    modalOrderItemPrice: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#007bff',
        flex: 1,
        textAlign: 'right',
    },
    modalOrderItemDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalOrderItemQuantity: {
        fontSize: 12,
        color: '#6c757d',
    },
    modalOrderItemTotal: {
        fontSize: 12,
        fontWeight: '600',
        color: '#28a745',
    },
    modalSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#dee2e6',
    },
    modalSummaryLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#343a40',
    },
    modalSummaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#28a745',
    },
    modalAddressText: {
        fontSize: 14,
        color: '#343a40',
        lineHeight: 20,
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
    },
    statusCheckboxContainer: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        alignItems: 'center', 
        marginTop: 4 
    },
    statusCheckboxItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginRight: 12, 
        marginBottom: 4 
    },
    statusCheckboxLabel: { 
        marginLeft: 4, 
        fontSize: 12, 
        color: '#343a40', 
        textTransform: 'capitalize' 
    },
    remarksContainer: { 
        width: '100%', 
        marginTop: 10, 
        paddingHorizontal: 20 
    },
    remarksLabel: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: '#343a40', 
        marginBottom: 4 
    },
    remarksInput: {
        borderWidth: 1,
        borderColor: '#dee2e6',
        borderRadius: 8,
        padding: 8,
        minHeight: 60,
        textAlignVertical: 'top',
        backgroundColor: '#fff'
    },
    remarksButtons: { 
        flexDirection: 'row', 
        justifyContent: 'flex-end', 
        marginTop: 8 
    },
    remarksButton: { 
        paddingVertical: 6, 
        paddingHorizontal: 14, 
        borderRadius: 6, 
        marginLeft: 8 
    },
    remarksCancelButton: { 
        backgroundColor: '#e5e7eb' 
    },
    remarksCancelButtonText: { 
        color: '#374151', 
        fontWeight: '600' 
    },
    remarksSubmitButton: { 
        backgroundColor: '#007bff' 
    },
    remarksSubmitButtonText: { 
        color: '#fff', 
        fontWeight: '600' 
    },
});

export default OrderDetailModal;

