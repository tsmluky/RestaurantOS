import React from "react";
import { Tabs } from "expo-router";
import { LayoutDashboard, ClipboardList, Users, User } from "lucide-react-native";
import { colors } from "@/lib/colors";

export default function ManagerLayout() {
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
          title: "En vivo",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} stroke={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="fichajes"
        options={{
          title: "Fichajes",
          tabBarIcon: ({ color, size }) => (
            <ClipboardList size={size} stroke={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="empleados"
        options={{
          title: "Equipo",
          tabBarIcon: ({ color, size }) => (
            <Users size={size} stroke={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <User size={size} stroke={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
