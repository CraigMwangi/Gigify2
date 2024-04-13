import React from "react";
import { Link, useNavigate } from "react-router-dom";

const CalendarModal = ({ isOpen, onClose, event }) => {
  const navigate = useNavigate();

  const getDirectionsUrl = () => {
    if (!event || !event.location) return "#";
    const { lat, lng } = event.location;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  const handleSeeEvent = () => {
    // Take user to specific event based on event id
    navigate(`/events#${event.id}`);
  };

  if (!isOpen || !event) return null; // Ensures the event is present before attempting to render

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
            <p>Start: {new Date(event.start).toLocaleString()}</p>
            <p>End: {new Date(event.end).toLocaleString()}</p>
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

export default CalendarModal;
