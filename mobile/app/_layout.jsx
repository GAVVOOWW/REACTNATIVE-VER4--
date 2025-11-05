import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Link, Slot, Stack } from 'expo-router'

const RootLayout = () => {
  return (
    <Stack>
      <Stack.Screen name='index' options={{ headerShown: false }} />
      <Stack.Screen name='Signup' options={{ headerShown: false }} />
      <Stack.Screen name='Login' options={{ headerShown: false }} />
      <Stack.Screen name='MainTabs' options={{ headerShown: false }} />
      <Stack.Screen name='productDetails' options={{ headerShown: false }} />
      <Stack.Screen name='cart' options={{ headerShown: false }} />
      <Stack.Screen name='checkout' options={{ headerShown: false }} />
      <Stack.Screen name='AdminPage' options={{ headerShown: false }} />
      <Stack.Screen name='OrderDetail' options={{ headerShown: false }} />
      <Stack.Screen name='OrderHistory' options={{ headerShown: false }} />
      <Stack.Screen name='RecommendationPage' options={{ headerShown: false }} />
      <Stack.Screen name='ChatPage' options={{ headerShown: false }} />
      <Stack.Screen name='UserProfile' options={{ headerShown: false }} />
      <Stack.Screen name='SuccessPage' options={{ headerShown: false }} />
      <Stack.Screen name='CancelPage' options={{ headerShown: false }} />
    </Stack>


  )
}

export default RootLayout