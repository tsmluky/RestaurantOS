import * as Location from "expo-location";

export type LocationResult = {
  latitude: number;
  longitude: number;
};

/**
 * Pide permiso de ubicación y obtiene posición actual.
 * Solo llamar en el momento de fichar — nunca en background.
 * Devuelve null si el usuario deniega el permiso (el backend
 * aceptará el fichaje sin coordenadas en ese caso).
 */
export async function requestAndGetLocation(): Promise<LocationResult | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  } catch {
    return null;
  }
}

/**
 * Comprueba si el permiso ya está concedido sin mostrarlo al usuario.
 */
export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === "granted";
}
