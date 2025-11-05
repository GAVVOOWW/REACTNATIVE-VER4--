import React, { useState, useEffect } from 'react'
import { API_BASE_URL } from "@env";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'

// Import the pages
import ProductListing from './productListing'
import UserProfile from './UserProfile'
import ChatPage from './ChatPage'
import RecommendationPage from './RecommendationPage'

const Tab = createBottomTabNavigator()

// Login Button Component for unauthenticated users
const LoginButton = () => {
    const router = useRouter()

    return (
        <View style={styles.loginContainer}>
            <View style={styles.loginContent}>
                <Icon name="login" size={32} color="#2563EB" style={styles.loginIcon} />
                <Text style={styles.loginTitle}>Sign In Required</Text>
                <Text style={styles.loginSubtitle}>
                    Please sign in to access your profile and other features
                </Text>
                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() => router.push('/Login')}
                >
                    <Icon name="login" size={20} color="#FFFFFF" />
                    <Text style={styles.loginButtonText}>Sign In</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const MainTabs = () => {
    const [userRole, setUserRole] = useState(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const token = await AsyncStorage.getItem('token')
                const role = await AsyncStorage.getItem('userRole')

                setIsAuthenticated(!!token)
                setUserRole(role)
            } catch (error) {
                console.error('Error checking auth status:', error)
                setIsAuthenticated(false)
                setUserRole(null)
            } finally {
                setLoading(false)
            }
        }
        checkAuthStatus()
    }, [])

    const isAdmin = userRole === 'admin'

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Icon name="hourglass-empty" size={32} color="#2563EB" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        )
    }

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#6B7280',
                tabBarIcon: ({ color, size }) => {
                    let iconName = 'home'
                    if (route.name === 'Home') iconName = 'home'
                    else if (route.name === 'Profile') iconName = 'person'
                    else if (route.name === 'Login') iconName = 'login'
                    else if (route.name === 'Support') iconName = 'chat'
                    else if (route.name === 'AIRec') iconName = 'recommend'
                    return <Icon name={iconName} size={size} color={color} />
                },
            })}
        >
            <Tab.Screen name="Home" component={ProductListing} />

            {/* Conditional rendering based on authentication */}
            {isAuthenticated ? (
                <>
                    <Tab.Screen name="Profile" component={UserProfile} />
                    {!isAdmin && <Tab.Screen name="Support" component={ChatPage} />}
                </>
            ) : (
                <Tab.Screen
                    name="Login"
                    component={LoginButton}
                    options={{ title: 'Sign In' }}
                />
            )}

            <Tab.Screen name="AIRec" component={RecommendationPage} options={{ title: 'AI Rec' }} />
        </Tab.Navigator>
    )
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6B7280',
    },
    loginContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 32,
    },
    loginContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        width: '100%',
        maxWidth: 300,
    },
    loginIcon: {
        marginBottom: 16,
    },
    loginTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    loginSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    loginButton: {
        flexDirection: 'row',
        backgroundColor: '#2563EB',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
})

export default MainTabs 