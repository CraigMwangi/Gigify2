import React, { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "../components/firebase/firebaseConfig";
import { useAuth } from "../components/firebase/AuthContext";
import axios from "axios"; // Dependency to allow geocoding event location

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY; // Environment variable for API Key

function EventModal({ isOpen, onClose, onSave }) {
  const [event, setEvent] = useState({
    title: "",
    start: "",
    end: "",
    location: "",
    genre: "",
    description: "",
    capacity: "",
    actsneeded: "",
    email: "",
    username: "",
    latLng: { lat: null, lng: null },
  });
  const [photo, setPhoto] = useState(null);
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "photo") {
      setPhoto(e.target.files[0]);
    } else {
      setEvent((prevDetails) => ({ ...prevDetails, [name]: value }));
    }
  };

  const geocodeLocation = async (location) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: location,
            key: "AIzaSyAJP4EUYo_UsOFFPFHiIjcwU_OI77GQhIQ",
          },
        }
      );
      if (response.data.status === "OK") {
        return response.data.results[0].geometry.location;
      } else {
        throw new Error(
          "Geocoding failed, please add a valid location e.g. London: " +
            response.data.status
        );
      }
    } catch (error) {
      setError("Geocoding error. Please try again.");
      throw error; // Rethrow to handle it in calling function
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const latLng = await geocodeLocation(event.location);
      setEvent((prev) => ({ ...prev, latLng }));
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const now = new Date();

      if (startDate < now) {
        throw new Error("Event date cannot be in the past.");
      }

      if (startDate > endDate) {
        throw new Error("End date must be after start date.");
      }

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid start or end date.");
      }

      let photoURL = "";
      if (photo) {
        const photoRef = ref(storage, `events/${Date.now()}_${photo.name}`);
        const snapshot = await uploadBytes(photoRef, photo);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      const firestoreEvent = {
        ...event,
        type: "AppEvent",
        photoURL,
        capacity: parseInt(event.capacity, 10), // Ensure capacity is a number
        uid: currentUser.uid,
        genre: event.genre,
        email: currentUser.email,
        username: currentUser.displayName || "Anonymous",
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
        latLng,
      };

      const docRef = await addDoc(
        collection(firestore, "events"),
        firestoreEvent
      );
      alert("Event created successfully");

      // Call onSave with the full event data including the new Firestore document ID
      onSave({
        id: docRef.id,
        ...firestoreEvent,
      });

      onClose(); // Close the modal
    } catch (error) {
      console.error("Error creating new event: ", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="event-modal-container">
      <div className="close-button" onClick={onClose}>
        X
      </div>
      <div className="event-modal-content">
        <h2>Create Your Event</h2>
        <p className="centre-text">Events can be anytime, not just at night.</p>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <form onSubmit={handleSubmit} className="form">
          <label>
            Title:
            <input
              type="text"
              name="title"
              value={event.title}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Genre:
            <input
              type="text"
              name="genre"
              value={event.genre}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            From:
            <input
              type="datetime-local"
              name="start"
              value={event.start}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Till:
            <input
              type="datetime-local"
              name="end"
              value={event.end}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Location:
            <input
              type="text"
              name="location"
              value={event.location}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            No. of Acts Needed:
            <input
              type="text"
              name="actsneeded"
              value={event.actsneeded}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Description:
            <textarea
              name="description"
              value={event.description}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Capacity:
            <input
              type="number"
              name="capacity"
              value={event.capacity}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Contact Email:
            <textarea
              name="email"
              value={event.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Event Flyer:
            <input type="file" name="photo" onChange={handleChange} />
          </label>
          <button type="submit" disabled={loading} className="button">
            Save Event
          </button>
        </form>
      </div>
    </div>
  );
}

export default EventModal;
