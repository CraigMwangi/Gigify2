import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { firestore, storage } from "../components/firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import EmailModal from "./emailModal";
import { gapi } from "gapi-script";
import { useAuth } from "../components/firebase/AuthContext";

const EventDetailsPage = () => {
  const { eventId } = useParams();
  const [eventDetails, setEventDetails] = useState(null);
  const [error, setError] = useState("");
  const [creatorDetails, setCreatorDetails] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      // Attempt to fetch event details from Firestore first
      const docRef = doc(firestore, "events", eventId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        setEventDetails({
          ...firestoreData,
          start: firestoreData.start.toDate(),
          end: firestoreData.end.toDate(),
        });
        fetchCreatorDetails(firestoreData.uid);
      } else {
        // If event is not in Firestore, try fetching from Google Calendar
        fetchGoogleCalendarEvent();
      }
    };

    const fetchGoogleCalendarEvent = async () => {
      if (!gapi.client) {
        console.error("Google API client not initialized.");
        setError("Google API client not initialized.");
        return;
      }
      try {
        const response = await gapi.client.calendar.events.get({
          calendarId: "primary",
          eventId: eventId,
        });
        const event = response.result;
        setEventDetails({
          title: event.summary,
          description: event.description,
          location: event.location,
          start: new Date(event.start.dateTime || event.start.date),
          end: new Date(event.end.dateTime || event.end.date),
          // Include any other details you need from the Google Calendar event
        });
      } catch (error) {
        console.error("Failed to fetch event from Google Calendar: ", error);
        setError("Failed to fetch event from Google Calendar.");
      }
    };

    const fetchCreatorDetails = async (uid) => {
      const userRef = doc(firestore, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setCreatorDetails(userSnap.data());
      } else {
        console.error("Failed to fetch event creator details.");
      }
    };

    fetchEventDetails();
  }, [eventId]);

  const handleAddToGoogleCalendar = async () => {
    if (!gapi.client || !eventDetails) {
      alert("Google API client not initialized or event details missing.");
      return;
    }

    const event = {
      summary: eventDetails.title,
      location: eventDetails.location,
      description: eventDetails.description,
      start: {
        dateTime: new Date(eventDetails.start).toISOString(),
        timeZone: "UTC", // Adjust time zone if needed
      },
      end: {
        dateTime: new Date(eventDetails.end).toISOString(),
        timeZone: "UTC", // Adjust time zone if needed
      },
    };

    try {
      const response = await gapi.client.calendar.events.insert({
        calendarId: "primary",
        resource: event,
      });

      if (response.status === 200) {
        alert("Event added to Google Calendar");
      } else {
        console.error("Failed to add event to Google Calendar", response);
        alert("Failed to add event to Google Calendar.");
      }
    } catch (error) {
      console.error("Error adding event to Google Calendar: ", error);
      alert("Error adding event to Google Calendar.");
    }
  };

  if (!eventDetails) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{eventDetails.title}</h1>
      <p>
        Start:{" "}
        {eventDetails.start
          ? eventDetails.start.toLocaleString()
          : "Loading..."}
      </p>
      <p>
        End:{" "}
        {eventDetails.end ? eventDetails.end.toLocaleString() : "Loading..."}
      </p>
      <p>Description: {eventDetails.description}</p>
      <p>Location: {eventDetails.location}</p>
      <p>Capacity: {eventDetails.capacity}</p>
      {eventDetails.photoURL && (
        <img
          src={eventDetails.photoURL}
          alt="Event"
          style={{ maxWidth: "100%", height: "auto" }}
        />
      )}
      {creatorDetails && (
        <p>
          Created by:{" "}
          <Link to={`/user/${eventDetails.uid}`}>
            {creatorDetails.username || "Unknown"} ({creatorDetails.fullName})
          </Link>
        </p>
      )}
      {/* Display capacity and photo if available */}
      {/* Update form for capacity and photo */}
      {/* <form onSubmit={handleFormSubmit}>
        <label>
          Capacity:
          <input
            type="number"
            value={capacity}
            onChange={handleCapacityChange}
          />
        </label>
        <label>
          Event Photo:
          <input type="file" onChange={handleFileChange} />
        </label>
        <button type="submit" disabled={uploading}>
          Update Event
        </button>
      </form> */}

      <button onClick={handleAddToGoogleCalendar}>
        Add to Google Calendar
      </button>
      <button onClick={() => setIsModalOpen(true)}>Send Message</button>
      <EmailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default EventDetailsPage;
