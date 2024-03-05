import React, { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "../components/firebase/firebaseConfig";
import { useAuth } from "../components/firebase/AuthContext";
import axios from "axios";

const GOOGLE_MAPS_API_KEY = "AIzaSyAJP4EUYo_UsOFFPFHiIjcwU_OI77GQhIQ"; // Use environment variable for API Key

function EventModal({ isOpen, onClose, onSave }) {
  const [eventDetails, setEventDetails] = useState({
    title: "",
    start: "",
    end: "",
    location: "",
    genre: "",
    description: "",
    capacity: "",
    actsneeded: "",
    // Remove photoURL from state as we'll handle photo file separately
  });
  const [photo, setPhoto] = useState(null); // Handle photo file separately

  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "photo") {
      // Handle photo file separately
      setPhoto(e.target.files[0]);
    } else {
      setEventDetails((prevDetails) => ({ ...prevDetails, [name]: value }));
    }
  };

  const geocodeLocation = async (location) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: location,
            key: GOOGLE_MAPS_API_KEY,
          },
        }
      );
      if (response.data.status === "OK") {
        return response.data.results[0].geometry.location; // Return the location object with lat and lng
      } else {
        console.error("Geocoding failed:", response.data.status);
        setError("Geocoding failed. Please check the location.");
        return null;
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setError("Geocoding error. Please try again.");
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Geocode the location before saving the event
    const latLng = await geocodeLocation(eventDetails.location);
    if (!latLng) {
      setLoading(false);
      return; // Stop the submission if geocoding fails
    }

    // Validate start and end dates
    const startDate = new Date(eventDetails.start);
    const endDate = new Date(eventDetails.end);
    if (startDate > endDate) {
      setError("End date must be after start date.");
      setLoading(false);
      return;
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError("Invalid start or end date.");
      setLoading(false);
      return;
    }

    try {
      let photoURL = "";
      // Upload photo to Firebase Storage and get the URL
      if (photo) {
        const photoRef = ref(storage, `events/${Date.now()}_${photo.name}`);
        const snapshot = await uploadBytes(photoRef, photo);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // Prepare event data including the photo URL
      const firestoreEvent = {
        ...eventDetails,
        type: "AppEvent",
        photoURL,
        capacity: parseInt(eventDetails.capacity, 10), // Ensure capacity is stored as a number
        uid: currentUser.uid,
        genre: eventDetails.genre,
        email: currentUser.email,
        username: currentUser.displayName || "Anonymous",
        start: Timestamp.fromDate(startDate), // Convert validated Date to Firestore Timestamp
        end: Timestamp.fromDate(endDate), // Convert validated Date to Firestore Timestamp
      };

      // Save the event to Firestore
      await addDoc(collection(firestore, "events"), firestoreEvent);

      alert("Event created successfully");
      onClose(); // Close the modal
      onSave(); // Trigger refresh of events list
    } catch (error) {
      console.error("Error creating new event: ", error);
      setError("Failed to create new event.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "20%",
        left: "30%",
        backgroundColor: "white",
        padding: "20px",
        zIndex: 1000,
      }}
    >
      <div className="modal-content">
        <h2>Create Your Event</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          {/* Form fields for event details */}
          <label>
            Title:
            <input
              type="text"
              name="title"
              value={eventDetails.title}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Genre:
            <input
              type="text"
              name="genre"
              value={eventDetails.genre}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            From:
            <input
              type="datetime-local"
              name="start"
              value={eventDetails.start}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Till:
            <input
              type="datetime-local"
              name="end"
              value={eventDetails.end}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Location:
            <input
              type="text"
              name="location"
              value={eventDetails.location}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Acts Needed:
            <input
              type="text"
              name="actsneeded"
              value={eventDetails.actsneeded}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Description:
            <textarea
              name="description"
              value={eventDetails.description}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Capacity:
            <input
              type="number"
              name="capacity"
              value={eventDetails.capacity}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Photo:
            <input type="file" name="photo" onChange={handleChange} />
          </label>
          <button type="submit" disabled={loading}>
            Save Event
          </button>
        </form>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export default EventModal;
