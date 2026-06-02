import React from "react";
import { Tabs } from "expo-router";
import { Home, Calendar, Users, User } from "lucide-react-native";
import { colors } from "@/lib/colors";

export default function EmployeeLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Home size={size} stroke={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Calendario",
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size} stroke={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "Equipo",
          tabBarIcon: ({ color, size }) => (
            <Users size={size} stroke={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <User size={size} stroke={color} strokeWidth={2} />
          ),
        }}
      />
      {/* Pantallas accesibles por router.push pero ocultas en la tab bar */}
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="incidents" options={{ href: null }} />
      <Tabs.Screen name="shift/[id]" options={{ href: null }} />
    </Tabs>
  );
}
