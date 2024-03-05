import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfNCiZBEE0pxF-7O8Tb7U7HWSPefje50Q",
  authDomain: "gigify-0000a.firebaseapp.com",
  projectId: "gigify-0000a",
  storageBucket: "gigify-0000a.appspot.com",
  messagingSenderId: "556828166349",
  appId: "1:556828166349:web:d6ea3f4843f41211c48184",
  measurementId: "G-5BD5JEBP77",
};

//Sign in with Google

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const googleAuthProvider = new GoogleAuthProvider();
const storage = getStorage(app);

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const user = result.user;

    // Use the UID as the document ID in Firestore
    const userRef = doc(firestore, "users", user.uid);

    // Set (or update) the document with the user's information
    // You can customize the data object to include the information you want to store
    await setDoc(
      userRef,
      {
        email: user.email,
        displayName: user.displayName,
        lastLoggedIn: new Date(),
        // Add any other user profile information you'd like to store
      },
      { merge: true }
    ); // Use merge: true to update the document or create it if it doesn't exist

    console.log("User profile created or updated in Firestore");
  } catch (error) {
    console.error("Error signing in with Google:", error);
    // Handle errors here, such as displaying a notification to the user
  }
};

export const logout = () => {
  return signOut(auth);
};

// Export Firebase instances
export { storage, auth, firestore, googleAuthProvider };
