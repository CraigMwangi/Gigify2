// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/firebaseConfig";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  getAuth,
} from "firebase/auth";
import { gapi } from "gapi-script";

const AuthContext = createContext();

const googleAuthProvider = new GoogleAuthProvider();
// Add Google Calendar scope along with existing scopes
googleAuthProvider.addScope("https://www.googleapis.com/auth/calendar");

// Utility function to load the auth2 library and initialize client
const loadAuth2 = (gapi, clientId, apiKey) => {
  return new Promise((resolve, reject) => {
    gapi.load("client:auth2", {
      callback: () => {
        gapi.client
          .init({
            apiKey: apiKey,
            clientId: clientId,
            discoveryDocs: [
              "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
            ],
            scope: "https://www.googleapis.com/auth/calendar",
          })
          .then(() => {
            resolve(gapi.auth2.getAuthInstance());
          })
          .catch((error) => {
            reject(error);
          });
      },
      onerror: () => {
        reject(new Error("gapi.client failed to load!"));
      },
      timeout: 5000, // 5 seconds.
      ontimeout: () => {
        reject(new Error("gapi.client could not load in a timely manner!"));
      },
    });
  });
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authInstance, setAuthInstance] = useState(null);

  useEffect(() => {
    const clientId =
      "556828166349-jjodibfl9b6g3djt6r0hq93go56qjprr.apps.googleusercontent.com"; // Replace with your client ID
    const apiKey = "AIzaSyDfNCiZBEE0pxF-7O8Tb7U7HWSPefje50Q"; // Replace with your API key
    loadAuth2(gapi, clientId, apiKey)
      .then((auth2) => {
        setAuthInstance(auth2);
        // Optionally check if the user is already signed in with Google when the app loads
        if (auth2.isSignedIn.get()) {
          // Update your app state with the user's Google profile information
        }
      })
      .catch((error) => console.error("Error loading Google Auth2", error));

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        sessionStorage.setItem("userUID", user.uid);
        setCurrentUser(user);
      } else {
        sessionStorage.removeItem("userUID");
        setCurrentUser(null);
      }
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = () => {
    signInWithPopup(auth, googleAuthProvider)
      .then((result) => {
        setCurrentUser(result.user);
        // Direct the user to Google Calendar after successful sign in
        window.open("https://calendar.google.com/calendar/", "_blank");
      })
      .catch((error) => {
        console.error("Error signing in with Google:", error);
      });
  };

  const signOut = () => {
    auth
      .signOut()
      .then(() => {
        setCurrentUser(null);
        if (authInstance) {
          authInstance.signOut();
        }
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  return (
    <AuthContext.Provider value={{ currentUser, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const useFullName = () => {
  const { currentUser } = useAuth();

  const getFullName = () => {
    if (currentUser && currentUser.profileData) {
      return currentUser.profileData.fullName;
    }
    return null;
  };

  return { getFullName };
};
