"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowsForComs: true,
};

const StatCard = ({ title, value, icon }) => (
    <View style={styles.statCard}>
        <Icon name={icon} size={24} color="#007bff" />
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
    </View>
);

const ITEMS_PER_PAGE = 10;

const AnalyticsTab = ({ orders = [], products = [] }) => {
    const [timeframe, setTimeframe] = useState('Daily'); // Hourly, Daily, Weekly, Monthly
    const [currentPage, setCurrentPage] = useState(1);

    const analyticsData = useMemo(() => {
        if (!orders.length || !products.length) {
            return {
                totalSales: 0,
                totalProfit: 0,
                salesChart: { labels: [], datasets: [{ data: [0] }] },
                itemSalesPie: [],
                topProducts: [],
                allProductsList: [],
            };
        }

        const productMap = new Map(products.map(p => [p._id, p]));
        const now = new Date();
        let totalSales = 0;
        let totalProfit = 0;
        const itemSales = {};

        const filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            if (timeframe === 'Hourly') {
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                return orderDate >= oneDayAgo;
            }
            if (timeframe === 'Daily') {
                const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                return orderDate >= oneWeekAgo;
            }
            if (timeframe === 'Weekly') {
                const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                return orderDate >= oneMonthAgo;
            }
            if (timeframe === 'Monthly') {
                const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                return orderDate >= oneYearAgo;
            }
            return true;
        });

        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                const product = productMap.get(item.item?._id);
                const salePrice = item.price * item.quantity;
                // Custom item profit calculation
                if (product && product.is_customizable && item.customizations) {
                    // Materials cost
                    const materialsCost = (item.customizations.materials || []).reduce((sum, m) => sum + (m.cost || 0), 0);
                    // Labor cost
                    const laborCost = (item.customizations.labor_cost_per_day || 0) * (item.customizations.estimated_days || 0);
                    // Overhead cost
                    const overheadCost = item.customizations.overhead_cost || 0;
                    // Total cost
                    const totalCost = materialsCost + laborCost + overheadCost;
                    // Profit margin (default to 0.5 if not present)
                    const profitMargin = typeof item.customizations.profit_margin === 'number' ? item.customizations.profit_margin : 0.5;
                    // Intended profit: totalCost * profitMargin
                    // Actual profit: salePrice - totalCost
                    const profit = salePrice - totalCost;
                    totalSales += salePrice;
                    totalProfit += profit;
                    if (!itemSales[product.name]) {
                        itemSales[product.name] = { sales: 0, quantity: 0 };
                    }
                    itemSales[product.name].sales += salePrice;
                    itemSales[product.name].quantity += item.quantity;
                } else if (product && !product.is_customizable) {
                    // Non-custom item profit
                    const cost = product.cost * item.quantity;
                    totalSales += salePrice;
                    totalProfit += salePrice - cost;
                    if (!itemSales[product.name]) {
                        itemSales[product.name] = { sales: 0, quantity: 0 };
                    }
                    itemSales[product.name].sales += salePrice;
                    itemSales[product.name].quantity += item.quantity;
                } else if (product) {
                    // Custom item but no customizations info, just count sales
                    totalSales += salePrice;
                    if (!itemSales[product.name]) {
                        itemSales[product.name] = { sales: 0, quantity: 0 };
                    }
                    itemSales[product.name].sales += salePrice;
                    itemSales[product.name].quantity += item.quantity;
                }
            });
        });

        // Data for Sales Line Chart
        const salesChartData = {};
        filteredOrders.forEach(order => {
            const date = new Date(order.createdAt);
            let key;
            if (timeframe === 'Hourly') key = `${date.getHours()}:00`;
            else if (timeframe === 'Daily') key = date.toLocaleDateString('en-US', { weekday: 'short' });
            else if (timeframe === 'Weekly') key = `W${Math.ceil(date.getDate() / 7)}`;
            else if (timeframe === 'Monthly') key = date.toLocaleDateString('en-US', { month: 'short' });

            const orderTotal = order.totalAmount || order.amount || 0;
            if (!salesChartData[key]) salesChartData[key] = 0;
            salesChartData[key] += orderTotal;
        });

        const salesChart = {
            labels: Object.keys(salesChartData),
            datasets: [{ data: Object.values(salesChartData) }]
        };
        if (!salesChart.labels.length) {
            salesChart.labels.push('No Data');
            salesChart.datasets[0].data.push(0);
        }


        const pieColors = ['#007bff', '#17a2b8', '#28a745', '#ffc107', '#dc3545', '#6c757d'];
        const itemSalesPie = Object.entries(itemSales)
            .sort(([, a], [, b]) => b.sales - a.sales)
            .slice(0, 5)
            .map(([name, data], index) => ({
                name,
                population: data.sales,
                color: pieColors[index % pieColors.length],
                legendFontColor: '#7F7F7F',
                legendFontSize: 14,
            }));

        const topProducts = Object.entries(itemSales)
            .sort(([, a], [, b]) => b.sales - a.sales)
            .slice(0, 5)
            .map(([name, data]) => ({ name, ...data }));

        const allProductsList = Object.entries(itemSales)
            .sort(([, a], [, b]) => b.sales - a.sales)
            .map(([name, data]) => ({ name, ...data }));


        return { totalSales, totalProfit, salesChart, itemSalesPie, topProducts, allProductsList };
    }, [orders, products, timeframe]);

    // Reset to first page when timeframe changes
    useEffect(() => { setCurrentPage(1); }, [timeframe]);

    // Pagination logic for allProductsList
    const totalItems = analyticsData.allProductsList.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginatedItems = analyticsData.allProductsList.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.pageTitle}>Analytics</Text>

            <View style={styles.timeframeSelector}>
                {['Hourly (24h)', 'Daily (7d)', 'Weekly (4w)', 'Monthly (12m)'].map(periodLabel => {
                    const mapLabelToState = {
                        'Hourly (24h)': 'Hourly',
                        'Daily (7d)': 'Daily',
                        'Weekly (4w)': 'Weekly',
                        'Monthly (12m)': 'Monthly',
                    };
                    const period = mapLabelToState[periodLabel];
                    return (
                        <TouchableOpacity
                            key={period}
                            style={[styles.timeframeButton, timeframe === period && styles.timeframeButtonActive]}
                            onPress={() => setTimeframe(period)}
                        >
                            <Text style={[styles.timeframeText, timeframe === period && styles.timeframeTextActive]}>{periodLabel}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.statsContainer}>
                <StatCard title="Total Sales" value={`₱${analyticsData.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon="trending-up" />
                <StatCard title="Total Profit (Non-Custom)" value={`₱${analyticsData.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon="attach-money" />
            </View>

            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Sales Trend ({timeframe})</Text>
                <LineChart
                    data={analyticsData.salesChart}
                    width={screenWidth - 40}
                    height={220}
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chart}
                />
            </View>

            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Top 5 Item Sales Distribution</Text>
                {analyticsData.itemSalesPie.length > 0 ? (
                    <PieChart
                        data={analyticsData.itemSalesPie}
                        width={screenWidth - 40}
                        height={220}
                        chartConfig={chartConfig}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        absolute
                    />
                ) : (
                    <Text style={styles.noDataText}>No sales data for items in this period.</Text>
                )}
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Top Selling Products</Text>
                {analyticsData.topProducts.map((product, index) => (
                    <View key={index} style={styles.productRow}>
                        <Text style={styles.productName}>{index + 1}. {product.name}</Text>
                        <View>
                            <Text style={styles.productSales}>₱{product.sales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                            <Text style={styles.productQuantity}>{product.quantity} sold</Text>
                        </View>
                    </View>
                ))}
                {analyticsData.topProducts.length === 0 && <Text style={styles.noDataText}>No products sold in this period.</Text>}
            </View>

            {/* Full Item Sales List */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>All Item Sales</Text>
                {paginatedItems && paginatedItems.length > 0 ? (
                    paginatedItems.map((product, index) => (
                        <View key={index + (currentPage - 1) * ITEMS_PER_PAGE} style={styles.productRow}>
                            <Text style={styles.productName}>{index + 1 + (currentPage - 1) * ITEMS_PER_PAGE}. {product.name}</Text>
                            <View>
                                <Text style={styles.productSales}>₱{product.sales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                                <Text style={styles.productQuantity}>{product.quantity} sold</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.noDataText}>No products sold in this period.</Text>
                )}
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <View style={styles.paginationContainer}>
                        <TouchableOpacity
                            style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                            onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <Text style={styles.paginationButtonText}>Previous</Text>
                        </TouchableOpacity>
                        <Text style={styles.paginationInfo}>Page {currentPage} of {totalPages}</Text>
                        <TouchableOpacity
                            style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                            onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <Text style={styles.paginationButtonText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 15,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#343a40',
        marginBottom: 20,
    },
    timeframeSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
        backgroundColor: '#e9ecef',
        borderRadius: 20,
        padding: 4,
    },
    timeframeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 18,
    },
    timeframeButtonActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    timeframeText: {
        textAlign: 'center',
        fontSize: 14,
        color: '#6c757d',
        fontWeight: '500',
    },
    timeframeTextActive: {
        color: '#007bff',
        fontWeight: 'bold',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 15,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    statTitle: {
        fontSize: 14,
        color: '#6c757d',
        marginTop: 5,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#343a40',
        marginTop: 5,
    },
    chartContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#343a40',
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    chart: {
        borderRadius: 12,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#343a40',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f5',
        paddingBottom: 10,
    },
    productRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f5',
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#495057',
    },
    productSales: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#28a745',
        textAlign: 'right',
    },
    productQuantity: {
        fontSize: 12,
        color: '#6c757d',
        textAlign: 'right',
    },
    noDataText: {
        textAlign: 'center',
        color: '#6c757d',
        padding: 20,
        fontStyle: 'italic',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        gap: 10,
    },
    paginationButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#007bff',
        borderRadius: 8,
    },
    paginationButtonDisabled: {
        backgroundColor: '#b0b0b0',
    },
    paginationButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    paginationInfo: {
        marginHorizontal: 10,
        color: '#343a40',
        fontWeight: '600',
    },
});

export default AnalyticsTab; 