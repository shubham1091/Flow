// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import {initializeAuth, getReactNativePersistence} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLSYwh_xwfJE39yAZl1t0SaAQb3nkm-eQ",
  authDomain: "flow-8e357.firebaseapp.com",
  projectId: "flow-8e357",
  storageBucket: "flow-8e357.firebasestorage.app",
  messagingSenderId: "510986593323",
  appId: "1:510986593323:web:cb5827a57ee8cf0be4b66e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
})

export const firestore = getFirestore(app)