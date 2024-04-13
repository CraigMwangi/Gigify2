import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";

const MapModal = ({ isOpen, onClose, event }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const fetchUsername = async () => {
      if (event && event.uid) {
        try {
          const userRef = doc(firestore, "users", event.uid); // Fetch username of user
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setUsername(userSnap.data().username);
          } else {
            console.log("No user document found!");
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
        }
      }
    };

    fetchUsername();
  }, [event]);

  // Function to create link for directions using Google Maps

  const getDirectionsUrl = () => {
    if (!event || !event.location) return "#";
    const { lat, lng } = event.location;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  // See event function to direct user to event
  const handleSeeEvent = () => {
    navigate(`/events#${event.id}`);
  };

  if (!isOpen || !event) return null; // Ensures event is present before attempting to render

  return (
    <div className="modal-overlay">
      <div className="email-modal-events-container">
        <div className="email-modal-header">
          <div className="close-button" onClick={onClose}>
            X
          </div>
        </div>
        <div className="email-modal-content">
          <>
            <h2>{event.title}</h2>
            <p>Start: {event.start?.toDate().toLocaleString()}</p>
            <p>End: {event.end?.toDate().toLocaleString()}</p>
            <p>Description: {event.description}</p>
            <p>Location: {event.location}</p>
            <p>
              Created by:{" "}
              <Link to={`/user/${event.uid}`}>
                Go to {event.username}'s profile
              </Link>
            </p>
            <a
              href={getDirectionsUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Directions 📍
            </a>
            <div style={{ marginTop: "20px" }}>
              <button onClick={handleSeeEvent} className="button">
                See Event
              </button>
            </div>
          </>
        </div>
      </div>
    </div>
  );
};

export default MapModal;
