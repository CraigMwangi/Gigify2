import React, { useState, useEffect, useRef } from "react";
import { firestore } from "../components/firebase/firebaseConfig";
import { useAuth } from "../components/firebase/AuthContext.js";
import MapModal from "./mapModal.js";
import EventMap from "./eventMap.js";

function HomePage() {
  const [error, setError] = useState("");
  const { currentUser } = useAuth();
  const initialized = useRef(false); // Prevent re-initialization of API

  useEffect(() => {
    const initializeGoogleAPI = async () => {
      if (!initialized.current) {
        try {
          initialized.current = true; // Mark as initialized
        } catch (error) {
          console.error("Error initializing Google API:", error);
          setError("Failed to initialize Google API.");
        }
      }
    };
    initializeGoogleAPI();
  }, []);

  return (
    <div className="container">
      <div className="home-content-container">
        <h2 className="header-text">Find Your Stage!</h2>
        <p className="centre-text">
          Gigify is a platform that connects local musicians and venues.
        </p>
        <p>
          Musicians and Venues can create a profile and list their availability,
          genre, and location. Allowing you to search for local musicians &
          venues based on these criteria for gigs.
        </p>
        <p className="centre-text">
          The goal of the platform is to empower local musicians and venues by
          providing an intuitive platform that puts the power of booking in the
          musicians hands and for venues, making the process of finding acts or
          venues much easier with all the details and acts in one place.
        </p>
        <p className="centre-text">
          If you're a musician or venue, sign up and try Gigify for your next
          live music event! 🎤
        </p>
        &nbsp;
      </div>
      {error && <p>Error: {error}</p>}
      <EventMap />
      &nbsp;
      <h5 className="centre-text">
        Use the map and click on the markers to see upcoming events.
      </h5>
    </div>
  );
}

export default HomePage;
