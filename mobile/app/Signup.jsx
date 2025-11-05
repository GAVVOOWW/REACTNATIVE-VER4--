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
import SimpleCaptcha from './components/SimpleCaptcha'

const Signup = () => {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: {
      fullName: "",
      addressLine1: "",
      addressLine2: "",
      provinceCode: "",
      provinceName: "",
      cityCode: "",
      cityName: "",
      brgyCode: "",
      brgyName: "",
      postalCode: ""
    }
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [captchaValue, setCaptchaValue] = useState(null)


  const handleCaptchaVerify = (token) => {
    console.log('Captcha verified with token:', token)
    setCaptchaValue(token)
  }

  const handleCaptchaError = (error) => {
    console.error('Captcha error:', error)
    setCaptchaValue(null)
  }

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }



  const validateForm = () => {
    const { name, email, password, confirmPassword, phone } = formData

    if (!name.trim()) {
      Alert.alert("Error", "Name is required")
      return false
    }

    if (!email.trim()) {
      Alert.alert("Error", "Email is required")
      return false
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert("Error", "Please enter a valid email address")
      return false
    }

    if (!password) {
      Alert.alert("Error", "Password is required")
      return false
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long")
      return false
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match")
      return false
    }

    if (!phone.trim()) {
      Alert.alert("Error", "Phone number is required")
      return false
    }

    if (!captchaValue) {
      Alert.alert("Error", "Please complete the captcha verification")
      return false
    }

    return true
  }

  const handleSignup = async () => {
    if (!validateForm()) return

    setLoading(true)

    try {
      console.log("Attempting to register user at:", `${API_BASE_URL}/api/registeruser`)

      const response = await fetch(`${API_BASE_URL}/api/registeruser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          phone: formData.phone.trim(),
          address: formData.address,
          role: "user",
          captcha: captchaValue
        }),
      })

      console.log("Registration response status:", response.status)
      const data = await response.json()
      console.log("Registration response data:", data)

      if (response.ok && data.success) {
        Alert.alert(
          "Success",
          data.message || "Account created successfully!",
          [
            {
              text: "OK",
              onPress: () => router.push("/Login")
            }
          ]
        )
      } else {
        Alert.alert(
          "Registration Failed",
          data.message || "Failed to create account. Please try again."
        )
      }
    } catch (error) {
      console.error("Registration error:", error)
      Alert.alert(
        "Network Error",
        `Unable to connect to server. Error: ${error.message}`
      )
    } finally {
      setLoading(false)
    }
  }

  const navigateToLogin = () => {
    router.push("/Login")
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.formCard}>
              <View style={styles.header}>
                <Icon name="person-add" size={48} color="#2563EB" />
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join us today</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Icon name="person" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={formData.name}
                    onChangeText={(value) => handleInputChange("name", value)}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>

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
                  <Icon name="phone" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChangeText={(value) => handleInputChange("phone", value)}
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="home" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Address Line 1"
                    value={formData.address.addressLine1}
                    onChangeText={(value) => handleInputChange("address.addressLine1", value)}
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
                    autoComplete="password-new"
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

                <View style={styles.inputContainer}>
                  <Icon name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChangeText={(value) => handleInputChange("confirmPassword", value)}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    <Icon name={showConfirmPassword ? "visibility" : "visibility-off"} size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <SimpleCaptcha
                  onVerify={handleCaptchaVerify}
                  onError={handleCaptchaError}
                  style={styles.captchaContainer}
                />

                <TouchableOpacity
                  style={[
                    styles.signUpButton, 
                    (loading || !captchaValue) && styles.signUpButtonDisabled
                  ]}
                  onPress={handleSignup}
                  disabled={loading || !captchaValue}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : !captchaValue ? (
                    <Text style={styles.signUpButtonText}>Complete Captcha First</Text>
                  ) : (
                    <Text style={styles.signUpButtonText}>Create Account</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.loginLink}
                  onPress={navigateToLogin}
                  disabled={loading}
                >
                  <Text style={styles.loginLinkText}>
                    Already have an account? <Text style={styles.loginLinkHighlight}>Sign In</Text>
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
  signUpButton: {
    backgroundColor: "#2563EB",
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  signUpButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  signUpButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loginLink: {
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: 14,
    color: "#6B7280",
  },
  loginLinkHighlight: {
    color: "#2563EB",
    fontWeight: "600",
  },
  captchaContainer: {
    marginBottom: 16,
  },

})

export default Signup
