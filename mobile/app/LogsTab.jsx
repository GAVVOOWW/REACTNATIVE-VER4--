import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from "@env";
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const LogsTab = ({ API_BASE_URL, getAuthToken }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getAuthToken();
            if (!token) {
                setError("Authentication token not found.");
                setLoading(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch logs. Status: ${response.status}`);
            }

            const data = await response.json();
            setLogs(data.logs || []);
        } catch (err) {
            console.error("Error fetching logs:", err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const renderLogItem = ({ item, index }) => (
        <View style={[styles.logItem, index % 2 === 0 ? styles.logItemAlt : null]}>
            <View style={styles.logHeader}>
                <Text style={styles.logAction}>{item.action.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={styles.logTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
            <View style={styles.logBody}>
                <Text style={styles.logText}>
                    {(() => {
                        const actionParts = item.action ? item.action.split('_') : [];
                        const verb = actionParts[actionParts.length - 1] || 'performed';
                        // Map entity types to nicer names
                        const entityMap = {
                            item: 'product',
                            user: 'user',
                            order: 'order',
                            payment: 'payment',
                            category: 'category',
                            furnituretype: 'furniture type',
                        };
                        const entityName = entityMap[item.entityType] || item.entityType;
                        const userName = item.userName || 'System';
                        const role = item.userRole || 'system';

                        // Special case for login for better grammar
                        if (item.action === 'user_login') {
                            return (
                                <Text style={styles.logText}>
                                    <Text style={styles.logUser}>{userName}</Text>
                                    {` (${role}) logged in `}
                                    <Text style={styles.logEntityId}>#{item.entityId?.slice(-6)}</Text>
                                </Text>
                            );
                        }

                        return (
                            <Text style={styles.logText}>
                                <Text style={styles.logUser}>{userName}</Text>
                                {` (${role}) ${verb} a ${entityName} `}
                                <Text style={styles.logEntityId}>#{item.entityId?.slice(-6)}</Text>
                            </Text>
                        );
                    })()}
                </Text>
                {/* Details hidden as per new requirement */}
            </View>
        </View>
    );

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text style={styles.loadingText}>Loading activity logs...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={[styles.emptyState, { marginHorizontal: 15 }]}>
                    <Icon name="error-outline" size={48} color="#dc3545" />
                    <Text style={styles.emptyStateText}>Error Loading Logs</Text>
                    <Text style={styles.emptyStateSubtext}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchLogs}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (logs.length === 0) {
            return (
                <View style={[styles.emptyState, { marginHorizontal: 15 }]}>
                    <Icon name="history" size={48} color="#6c757d" />
                    <Text style={styles.emptyStateText}>No activity logs found</Text>
                    <Text style={styles.emptyStateSubtext}>Admin actions will be recorded here.</Text>
                </View>
            );
        }

        return (
            <FlatList
                data={logs}
                renderItem={renderLogItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ padding: 15 }}
                showsVerticalScrollIndicator={false}
                onRefresh={fetchLogs}
                refreshing={loading}
            />
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Activity Logs</Text>
            {renderContent()}
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#6c757d',
    },
    emptyState: {
        padding: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#ffffff', borderRadius: 12, margin: 15,
    },
    emptyStateText: { fontSize: 18, fontWeight: 'bold', color: '#343a40', marginTop: 10, marginBottom: 5 },
    emptyStateSubtext: { fontSize: 14, color: '#6c757d', textAlign: 'center' },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#343a40', marginBottom: 20, paddingHorizontal: 15 },
    logItem: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    logItemAlt: {
        backgroundColor: '#f8f9fa',
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f5',
        paddingBottom: 10,
    },
    logAction: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#007bff',
        flex: 1,
    },
    logTimestamp: {
        fontSize: 12,
        color: '#6c757d',
    },
    logBody: {},
    logText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#495057',
        marginBottom: 10,
    },
    logUser: {
        fontWeight: 'bold',
        color: '#343a40',
    },
    logEntityId: {
        fontFamily: 'monospace',
        backgroundColor: '#e9ecef',
        paddingHorizontal: 4,
        borderRadius: 4,
        color: '#495057'
    },
    retryButton: {
        marginTop: 20,
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default LogsTab; 