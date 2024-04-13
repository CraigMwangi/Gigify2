// Imports the functions from the SDKs needed
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDfNCiZBEE0pxF-7O8Tb7U7HWSPefje50Q",
  authDomain: "gigify-0000a.firebaseapp.com",
  projectId: "gigify-0000a",
  storageBucket: "gigify-0000a.appspot.com",
  messagingSenderId: "556828166349",
  appId: "1:556828166349:web:d6ea3f4843f41211c48184",
  measurementId: "G-5BD5JEBP77",
};

// Initializes Firebase
const app = initializeApp(firebaseConfig);
const serviceAccount = require("C:\\Users\\craig\\Documents\\Gigify\\gigify-0000a-firebase-adminsdk-pw3hh-d6e72ee9f5.json");
const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Initializes services
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// Exports for use in other parts of the application
export { app, db, auth, GoogleAuthProvider };
