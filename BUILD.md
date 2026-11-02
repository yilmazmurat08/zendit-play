# Zendit Play — Android derleme

Bu klasör, TV arayüzü + 1. Parça + 2A + 2B uygulanmış, derlemeye hazır projedir.

Gerekenler: Node.js 22+, JDK 21, Android SDK (Platform 36) ve internet erişimi
(dl.google.com, maven.google.com, services.gradle.org, registry.npmjs.org).

```bash
npm ci
npm run android:sync      # vite build + npx cap sync android
cd android
./gradlew assembleDebug   # APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Android Studio ile: `npm ci && npm run android:sync && npx cap open android`, sonra Run ▶.
