// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import {initializeAuth, getReactNativePersistence} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyGY2nFTgWBbDt2_nlpSVkub65Dml2XbA",
  authDomain: "flow-5f886.firebaseapp.com",
  projectId: "flow-5f886",
  storageBucket: "flow-5f886.firebasestorage.app",
  messagingSenderId: "461731270771",
  appId: "1:461731270771:web:feca3f2f48f1b70a901a06"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
})

export const firestore = getFirestore(app)