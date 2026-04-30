// constants/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.projectId
) {
  throw new Error(
    "Firebase env missing. Copy .env.example to .env and set EXPO_PUBLIC_FIREBASE_* keys, then restart Expo with --clear."
  );
}

const app = initializeApp(firebaseConfig);

/**
 * Analytics uses the web SDK (document / gtag). Do not init on iOS/Android — it crashes
 * with getElementsByTagName on undefined. Use a native analytics solution if you need it.
 */
let analytics = null;
if (Platform.OS === "web" && typeof document !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) =>
      isSupported().then((ok) => {
        if (ok) {
          analytics = getAnalytics(app);
        }
      })
    )
    .catch(() => {});
}

function getNativeAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = Platform.OS === "web" ? getAuth(app) : getNativeAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);

export { analytics, app };
