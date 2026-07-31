import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
);

export const firebaseConfigReady = hasFirebaseConfig;

const app = hasFirebaseConfig
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

export const auth = app ? getAuth(app) : null;
export const googleProvider = hasFirebaseConfig ? new GoogleAuthProvider() : null;

// Firebase signOut clears the app session, but the browser may still have a
// Google session. Ask Google to show the account chooser on the next popup.
googleProvider?.setCustomParameters({ prompt: "select_account" });
