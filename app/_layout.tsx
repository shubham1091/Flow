import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "@/context/authContext";

const StackLayout = () => {
  return <Stack screenOptions={{ headerShown: false }} />;
};

// export default _layout;

export default function RootLayout(){
  return (
    <AuthProvider>
      <StackLayout />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({});
