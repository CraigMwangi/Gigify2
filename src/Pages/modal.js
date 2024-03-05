import React from "react";

// Modal.js
const Modal = ({ isOpen, onClose, event, onSave, onDelete }) => {
  if (!isOpen || !event) return null; // Handle case where event is undefined or null

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Event Details</h2>
        {event.title && <p>Title: {event.title}</p>}
        {event.start && <p>Start: {event.start.toString()}</p>}
        {event.end && <p>End: {event.end.toString()}</p>}
        <button onClick={() => onSave(event)}>Save Changes</button>
        <button onClick={() => onDelete(event)}>Delete Event</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default Modal;
