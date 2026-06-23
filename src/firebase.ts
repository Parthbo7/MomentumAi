import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB5x6xj931T4_RztWjm6Q_oh0op0rxQroY",
  authDomain: "momentum-ai-30404.firebaseapp.com",
  projectId: "momentum-ai-30404",
  storageBucket: "momentum-ai-30404.firebasestorage.app",
  messagingSenderId: "1003692813929",
  appId: "1:1003692813929:web:b4c2cf3e2d96edb5befcf8",
  measurementId: "G-DDC65PXJ8F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
