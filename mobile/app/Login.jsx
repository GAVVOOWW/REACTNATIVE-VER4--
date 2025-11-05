"use client"

import { useState } from "react"
import { API_BASE_URL } from "@env";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'

const Login = () => {
    const router = useRouter()
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)

    

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleLogin = async () => {
        const { email, password } = formData

        if (!email || !password) {
            Alert.alert("Error", "Please fill in all fields")
            return
        }

        setLoading(true)

        try {
            console.log("Attempting to connect to:", `${API_BASE_URL}/api/login`)

            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password: password,
                }),
            })

            console.log("Response status:", response.status)
            const data = await response.json()
            console.log("Response data:", data)

            if (response.ok && data.success) {
                // Store the token and user data
                await AsyncStorage.setItem('token', data.token)
                await AsyncStorage.setItem('userId', data.userId)
                await AsyncStorage.setItem('userRole', data.role)

                // navigate immediately without pop-up
                if (data.role === 'admin') {
                    router.push("/MainTabs")
                } else {
                    router.push("/MainTabs")
                }
            } else {
                // Handle login failure
                Alert.alert(
                    "Login Failed",
                    data.message || "Invalid email or password"
                )
            }
        } catch (error) {
            console.error("Login error:", error)
            Alert.alert(
                "Network Error",
                `Unable to connect to server at ${API_BASE_URL}. Error: ${error.message}\n\nPlease check:\n1. Backend server is running\n2. Correct IP address\n3. Device is on same network`
            )
        } finally {
            setLoading(false)
        }
    }

    // Test connection function
    const testConnection = async () => {
        try {
            console.log("Testing connection to:", API_BASE_URL)
            const response = await fetch(`${API_BASE_URL}/api/items`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            console.log("Test response status:", response.status)
            Alert.alert("Connection Test", `Server responded with status: ${response.status}`)
        } catch (error) {
            console.error("Connection test error:", error)
            Alert.alert("Connection Test Failed", `Error: ${error.message}`)
        }
    }

    const navigateToSignup = () => {
        router.push("/Signup")
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.content}>
                        <View style={styles.formCard}>
                            <View style={styles.header}>
                                <Icon name="lock-open" size={48} color="#2563EB" />
                                <Text style={styles.title}>Welcome!</Text>
                                <Text style={styles.subtitle}>Sign in to your account</Text>
                            </View>

                            <View style={styles.form}>
                                <View style={styles.inputContainer}>
                                    <Icon name="email" size={20} color="#6B7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Email address"
                                        value={formData.email}
                                        onChangeText={(value) => handleInputChange("email", value)}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        editable={!loading}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Icon name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Password"
                                        value={formData.password}
                                        onChangeText={(value) => handleInputChange("password", value)}
                                        secureTextEntry={!showPassword}
                                        autoComplete="password"
                                        editable={!loading}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setShowPassword(!showPassword)}
                                        disabled={loading}
                                    >
                                        <Icon name={showPassword ? "visibility" : "visibility-off"} size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={[styles.signInButton, loading && styles.signInButtonDisabled]}
                                    onPress={handleLogin}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.signInButtonText}>Sign In</Text>
                                    )}
                                </TouchableOpacity>


                                <TouchableOpacity
                                    style={styles.signUpLink}
                                    onPress={navigateToSignup}
                                    disabled={loading}
                                >
                                    <Text style={styles.signUpLinkText}>
                                        Don't have an account? <Text style={styles.signUpLinkHighlight}>Sign Up</Text>
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
    },
    keyboardContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
    },
    content: {
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        minHeight: "100%",
    },
    formCard: {
        backgroundColor: "#FFFFFF",
        width: "100%",
        maxWidth: 500,
        padding: 24,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    header: {
        alignItems: "center",
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1F2937",
        marginTop: 16,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
    },
    form: {
        width: "100%",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        marginBottom: 16,
        paddingHorizontal: 12,
        backgroundColor: "#F9FAFB",
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: "#1F2937",
    },
    eyeIcon: {
        padding: 4,
    },
    signInButton: {
        backgroundColor: "#2563EB",
        height: 48,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    signInButtonDisabled: {
        backgroundColor: "#9CA3AF",
    },
    signInButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    testButton: {
        backgroundColor: "#2563EB",
        height: 48,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    testButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    signUpLink: {
        alignItems: "center",
    },
    signUpLinkText: {
        fontSize: 14,
        color: "#6B7280",
    },
    signUpLinkHighlight: {
        color: "#2563EB",
        fontWeight: "600",
    },
})

export default Login 