import { ThemeProvider } from "@/context/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ 
      headerBackTitle: "Back",
      animation: "slide_from_right",
      animationDuration: 300
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="camera-scan" 
        options={{ 
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "fade",
          animationDuration: 300
        }} 
      />
      <Stack.Screen 
        name="photo-preview" 
        options={{ 
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
          animationDuration: 400,
          gestureEnabled: true,
          gestureDirection: "vertical"
        }} 
      />
      <Stack.Screen 
        name="scan-result" 
        options={{ 
          headerShown: false,
          presentation: "card",
          animation: "slide_from_right",
          animationDuration: 300
        }} 
      />
      <Stack.Screen 
        name="pdf-converter" 
        options={{ 
          headerShown: false,
          presentation: "card",
          animation: "slide_from_right",
          animationDuration: 300
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}