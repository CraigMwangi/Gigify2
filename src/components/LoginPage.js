import React from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleAuthProvider, firestore } from "./firebase/firebaseConfig";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { gapi } from "gapi-script";

function LoginPage() {
  const navigate = useNavigate();
  const handleGoogleSignIn = () => {
    signInWithPopup(auth, googleAuthProvider)
      .then(async (result) => {
        const user = result.user;
        console.log("User:", user);

        // Initialize the Google API client library with the OAuth2 token
        gapi.load("client:auth2", () => {
          gapi.client
            .init({
              apiKey: "AIzaSyDfNCiZBEE0pxF-7O8Tb7U7HWSPefje50Q", // Provide your API key here
              clientId:
                "556828166349-jjodibfl9b6g3djt6r0hq93go56qjprr.apps.googleusercontent.com", // Provide your Client ID here
              discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
              ],
              scope: "https://www.googleapis.com/auth/calendar",
            })
            .then(() => {
              console.log("Google API client initialized for Calendar access.");
              // Additional logic to check if the user granted Calendar access can be implemented here
            });
        });
        const uid = result.user.uid;
        console.log("User UID:", uid);
        sessionStorage.setItem("userUID", uid);

        // Check if the user already has a profile
        const docRef = doc(firestore, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // User profile exists, navigate to user-profile page
          navigate(`/user-profile/${uid}`);
        } else {
          // No user profile, navigate to profile creation page
          navigate(`/edit-profile`);
        }
      })
      .catch((error) => {
        console.error("Error signing in with Google:", error);
      });
  };

  return (
    <div>
      <header>
        <h2>Sign Up or Login Below!</h2>
        <p>
          To sign up to Gigify please use your Google Account if you don't have
          one please create one.
        </p>
        <p>Click Here:</p>
        <button onClick={handleGoogleSignIn}>Sign in with Google</button>
      </header>
    </div>
  );
}

export default LoginPage;
