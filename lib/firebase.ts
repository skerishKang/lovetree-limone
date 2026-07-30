"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDQNR8bNIp4LG4EGNwl1ew8B7Har-KJC90",
  authDomain: "relovetree.firebaseapp.com",
  projectId: "relovetree",
  storageBucket: "relovetree.firebasestorage.app",
  messagingSenderId: "1091063063536",
  appId: "1:1091063063536:web:065a746e2578c47dd7b335",
  measurementId: "G-D4R5XMGFK5",
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const existing = getApps();
    if (existing.length > 0) {
      app = existing[0];
    } else {
      app = initializeApp(FIREBASE_CONFIG);
    }
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}
