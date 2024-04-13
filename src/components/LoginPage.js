import React from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleAuthProvider, firestore } from "./firebase/firebaseConfig";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { gapi } from "gapi-script";

function LoginPage() {
  const navigate = useNavigate();
  const handleGoogleSignIn = () => {
    signInWithPopup(auth, googleAuthProvider)
      .then(async (result) => {
        const user = result.user;

        // Initialize the Google API client library with the OAuth2 token
        gapi.load("client:auth2", () => {
          gapi.client
            .init({
              apiKey: "AIzaSyDfNCiZBEE0pxF-7O8Tb7U7HWSPefje50Q", // In Production I will hide this in env.
              clientId:
                "556828166349-jjodibfl9b6g3djt6r0hq93go56qjprr.apps.googleusercontent.com", // In Production I will hide this in env.
              discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
              ],
              scope: "https://www.googleapis.com/auth/calendar",
            })
            .then(() => {
              console.log("Google API client initialized for Calendar access.");
            });
        });

        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          console.log(
            "No user profile found, creating profile and navigating to register."
          );
          await setDoc(userDocRef, {
            name: user.displayName,
            email: user.email,
            createdAt: new Date(),
          }); // Set initial user data
          navigate(`/register`);
        } else {
          console.log("User profile exists, navigating to user-profile.");
          navigate(`/user-profile/${user.uid}`);
        }
      })
      .catch((error) => {
        console.error("Error signing in with Google:", error);
      });
  };

  return (
    <div className="container">
      <header>
        <h2>Sign Up or Login Below!</h2>
        <p>To sign up please use your Google Account.</p>
        <button onClick={handleGoogleSignIn} className="button">
          Sign in with Google
        </button>
      </header>
    </div>
  );
}

export default LoginPage;
