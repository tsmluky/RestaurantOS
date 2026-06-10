# RestaurantOS — Puesta en producción y APK (guía del día)

Todo el código está listo y commiteado. Estos son los pasos que ejecutas tú, en orden.

## 1. Push y CI (5 min)

```powershell
cd C:\Users\lukys\Desktop\RestaurantOS
git push origin main
```

- Vercel redespliega la web automáticamente (incluye el nuevo kiosk web).
- Railway redespliega el backend.
- GitHub Actions corre el CI (tests backend, build web, typecheck mobile). Revisa que salga verde en la pestaña Actions.

## 2. APK con EAS (20-30 min, casi todo espera)

Requisitos: cuenta gratuita en https://expo.dev

```powershell
cd mobile
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```

- La primera vez te preguntará si quieres crear el proyecto en Expo y generar el keystore: dile que sí a todo.
- El build corre en los servidores de Expo (~15-20 min). Al acabar te da una URL con el QR para descargar el APK.
- El APK ya apunta a producción (Railway) — configurado en `eas.json`.

### Instalar en los móviles
1. Abre la URL del build en el móvil y descarga el APK.
2. Android pedirá permiso para instalar de origen desconocido → aceptar.
3. Login empleado: su email + contraseña. La app detecta el rol automáticamente.

## 3. Kiosk en el ordenador del local (5 min)

1. En el PC del restaurante, abre Chrome → https://restaurant-os-pink.vercel.app/login
2. Inicia sesión con la cuenta del manager.
3. Ve a https://restaurant-os-pink.vercel.app/kiosk-mode
4. Selecciona la sucursal (queda guardada en ese equipo).
5. F11 para pantalla completa. Listo: los empleados fichan con su PIN.

Para que arranque solo al encender el PC, crea un acceso directo de Chrome con:
```
chrome.exe --kiosk https://restaurant-os-pink.vercel.app/kiosk-mode
```
y ponlo en la carpeta Inicio de Windows (`shell:startup`).

## 4. Checklist de validación en el local

```
□ Manager entra al panel y ve el dashboard En vivo
□ Empleado ficha entrada desde la app (APK) con GPS dentro de zona
□ Empleado ficha desde el kiosk con PIN → aparece en En vivo
□ Fichaje fuera de zona genera NEEDS_REVIEW y el manager lo corrige
□ Export mensual (XLSX) descarga correctamente
```

## Pendiente conocido (no bloquea)
- Stripe (suscripciones) — Antonio entra gratis de momento.
- Push notifications: el APK ya lleva la config; falta probar el envío real.
- Cuenta definitiva de Antonio (necesitamos su email).
