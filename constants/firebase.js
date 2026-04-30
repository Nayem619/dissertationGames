// constants/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDNq9Nolo-CwDka3Xjoo2vN_UG1nFDdnow",
  authDomain: "multigameappdissertation.firebaseapp.com",
  projectId: "multigameappdissertation",
  storageBucket: "multigameappdissertation.firebasestorage.app",
  messagingSenderId: "247081096191",
  appId: "1:247081096191:web:e46c725951ba48c1f58dca",
  measurementId: "G-FZYRP0XK6D"
};

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
