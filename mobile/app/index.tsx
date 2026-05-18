/**
 * Ruta raíz — el redirect real se hace en app/_layout.tsx
 * según el token y modo guardado en SecureStore.
 * Este fichero existe para que expo-router tenga una ruta "/" válida.
 */
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "@/lib/colors";

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
