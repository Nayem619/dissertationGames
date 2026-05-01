// constants/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

/** Valid-looking stub so expo export / SSR does not crash when env vars are absent (Render/CI). */
const FIREBASE_EXPORT_STUB = {
  apiKey: "export-missing-env-stub-key",
  authDomain: "export-missing-env-stub.firebaseapp.com",
  projectId: "export-missing-env-stub",
  storageBucket: "export-missing-env-stub.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000",
  measurementId: undefined,
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

const hasCredentials =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId;

if (!hasCredentials) {
  /** Local Expo dev: fail fast so you fix .env. Production bundle / expo export uses stub instead. */
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    throw new Error(
      "Firebase env missing. Copy .env.example to .env and set EXPO_PUBLIC_FIREBASE_* keys, then restart Expo with --clear."
    );
  }
  if (typeof console !== "undefined" && console.warn) {
    console.warn(
      "[firebase] EXPO_PUBLIC_FIREBASE_* not set — using stub for this build. " +
        "Set those env vars on Render (or CI) before `expo export` so the web app talks to real Firebase."
    );
  }
  Object.assign(firebaseConfig, FIREBASE_EXPORT_STUB);
}

/** False when stub was used — real deployments should rebuild with env so this is true */
export const firebaseIsConfigured =
  !!(process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);

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
