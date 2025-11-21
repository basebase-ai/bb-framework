/**
 * Firebase initialization with environment-based config
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
} from "firebase/firestore";
import {
  getAuth,
  connectAuthEmulator,
  onAuthStateChanged,
} from "firebase/auth";

// Load config from environment or index.html
const firebaseConfig = window.__FIREBASE_CONFIG__ || {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Development mode setup - only use emulators if explicitly enabled
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true") {
  // Connect to emulators if available (but don't fail if not)
  if (!window.__EMULATORS_CONNECTED__) {
    try {
      connectFirestoreEmulator(db, "localhost", 8080);
      connectAuthEmulator(auth, "http://localhost:9099", {
        disableWarnings: true,
      });
      window.__EMULATORS_CONNECTED__ = true;
      console.log("🔧 Connected to Firebase emulators");
    } catch (error) {
      console.log("⚠️  Failed to connect to emulators:", error.message);
    }
  }
} else if (import.meta.env.DEV) {
  console.log("📡 Using production Firebase");
}

// Enable offline persistence
enableIndexedDbPersistence(db, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
}).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Persistence failed: Multiple tabs open");
  } else if (err.code === "unimplemented") {
    console.warn("Persistence not available in this browser");
  }
});

// Auth state manager
export const authState = {
  user: null,
  ready: false,
  listeners: new Set(),

  subscribe(callback) {
    this.listeners.add(callback);
    if (this.ready) callback(this.user);
    return () => this.listeners.delete(callback);
  },

  notify() {
    this.listeners.forEach((cb) => cb(this.user));
  },
};

// Listen to auth changes
onAuthStateChanged(auth, (user) => {
  authState.user = user;
  authState.ready = true;
  authState.notify();
});
