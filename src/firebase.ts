import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyB_kKg5Esa9vV3nRT5NMOOiR67w8sgbfT0",
    authDomain: "tax-assistant-b4797.firebaseapp.com",
    projectId: "tax-assistant-b4797",
    storageBucket: "tax-assistant-b4797.firebasestorage.app",
    messagingSenderId: "174661988521",
    appId: "1:174661988521:web:7109bfdbc237b0d35779b8",
    measurementId: "G-ENBZDVSPKX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const storage = getStorage(app);