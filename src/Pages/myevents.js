import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";
import { useAuth } from "../components/firebase/AuthContext";
import EventForm from "./eventform.js";
import { gapi } from "gapi-script";

const MyEventsPage = () => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editEventId, setEditEventId] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Inside MyEventsPage component

  const [contactedEvents, setContactedEvents] = useState([]);

  useEffect(() => {
    const fetchContactedEvents = async () => {
      if (currentUser) {
        const q = query(
          collection(firestore, "contactedEvents"),
          where("uid", "==", currentUser.uid)
        );
        const contactedEventsList = [];
        const querySnapshot = await getDocs(q);
        for (const docSnapshot of querySnapshot.docs) {
          const eventData = await getDoc(
            doc(firestore, "events", docSnapshot.data().eventId)
          );
          if (eventData.exists()) {
            contactedEventsList.push({ id: eventData.id, ...eventData.data() });
          }
        }
        setContactedEvents(contactedEventsList);
      }
    };

    fetchContactedEvents();
  }, [currentUser]);

  const fetchFavorites = async () => {
    if (currentUser) {
      const favoritesRef = collection(firestore, "favorites");
      const q = query(favoritesRef, where("uid", "==", currentUser.uid));
      const favoriteEvents = [];
      const querySnapshot = await getDocs(q);
      for (const docSnapshot of querySnapshot.docs) {
        const eventData = await getDoc(
          doc(firestore, "events", docSnapshot.data().eventId)
        );
        if (eventData.exists()) {
          favoriteEvents.push({ id: eventData.id, ...eventData.data() });
        }
      }
      setEvents(favoriteEvents);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [currentUser]);

  useEffect(() => {
    const fetchMyEvents = async () => {
      if (currentUser) {
        setLoading(true);
        const q = query(
          collection(firestore, "events"),
          where("uid", "==", currentUser.uid)
        );
        try {
          const querySnapshot = await getDocs(q);
          const events = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setEvents(events);
        } catch (error) {
          console.error("Error fetching my events:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMyEvents();
  }, [currentUser]);

  const handleCreateEvent = async (eventData) => {
    setLoading(true);
    try {
      await addDoc(collection(firestore, "events"), {
        ...eventData,
        uid: currentUser.uid, // Ensure you capture the user ID with the event
      });
      setEvents([...events, eventData]);
    } catch (error) {
      console.error("Error adding new event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (eventId) => {
    setEditEventId(eventId);
  };

  const handleEventDelete = () => {
    // Logic to refresh events list or navigate user
    console.log("Event deleted");
    // For example, you could refresh the events list or navigate back to the event list page
  };

  const handleSave = async (formData) => {
    // Here you would add or update the event in Firestore
    console.log("Form data to save:", formData);
    // Reset edit mode after saving
    setEditEventId(null);
    // Optionally, refresh your events list
  };

  const handleUpdateEvent = async (id, updatedEventData) => {
    setLoading(true);
    try {
      const eventRef = doc(firestore, "events", id);
      await updateDoc(eventRef, updatedEventData);
      setEvents(
        events.map((event) =>
          event.id === id ? { ...event, ...updatedEventData } : event
        )
      );
      setEditingEvent(null); // Reset editing state
    } catch (error) {
      console.error("Error updating event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToGoogleCalendar = async (event, eventId) => {
    // Construct the URL for the event details page using the event's ID
    // Assuming your application's domain and routing are correctly set up
    const eventDetailsUrl = `http://localhost:3000/event/${eventId}`; // Use 'https' in production

    // Define the event object for Google Calendar
    // Include the URL in the description for direct navigation
    const googleEvent = {
      summary: event.title,
      location: event.location,
      description: `${event.description}\n\nView Event at: ${eventDetailsUrl}`,
      start: {
        dateTime: event.start.toISOString(),
        timeZone: "Europe/London",
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: "Europe/London",
      },
      extendedProperties: {
        private: {
          appIdentifier: "YourAppIdentifier",
        },
      },
      // Google Calendar Event's 'description' field is used to include the URL
    };

    // Add to Google Calendar using the API
    try {
      await gapi.client.calendar.events.insert({
        calendarId: "primary",
        resource: googleEvent,
      });
      alert("Event added to Google Calendar with a link to the details page.");
    } catch (error) {
      console.error("Error adding event to Google Calendar:", error);
      alert("Failed to add event to Google Calendar.");
    }
  };

  const removeFromFavorites = async (eventId) => {
    try {
      await deleteDoc(doc(firestore, "favorites", eventId));
      setEvents(events.filter((event) => event.id !== eventId));
    } catch (error) {
      console.error("Error removing event from favorites:", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>My Events</h2>
      {events.length > 0 ? (
        events.map((event) => (
          <div key={event.id}>
            <h3>{event.title}</h3>
            {/* Display other event details */}
            <button onClick={() => handleEditClick(event.id)}>Edit</button>
            {/* Add a delete button if needed */}
          </div>
        ))
      ) : (
        <p>
          No events found. Go to <Link to="/events">Events</Link> to create one!
        </p>
      )}
      <div>
        <h2>My Favorite Events</h2>
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.id}>
              <h3>{event.title}</h3>
              <p>{event.genre}</p>
              <p>Start: {event.start.toLocaleString()}</p>
              <p>End: {event.end.toLocaleString()}</p>
              <p>Description: {event.description}</p>
              <p>Location: {event.location}</p>
              <p>Capacity: {event.capacity}</p>
              <p>Event Flyer:</p>
              {event.photoURL && (
                <img
                  src={event.photoURL}
                  alt="Event"
                  style={{ maxWidth: "10%", height: "auto" }}
                />
              )}
              <p>
                Created by:{" "}
                <Link
                  to={`/user/${event.uid}`}
                  style={{ textDecoration: "underline" }}
                >
                  {event.username}
                </Link>
              </p>
              <button
                onClick={() => {
                  setIsEmailModalOpen(true);
                  setSelectedEvent(event); // Assuming you have a state to hold the selected event
                }}
              >
                Send a Booking
              </button>
              <button onClick={() => handleAddToGoogleCalendar(event)}>
                Add to Google Calendar
              </button>
              <button onClick={() => removeFromFavorites(event.id)}>
                Remove from Favorites
              </button>
            </div>
          ))
        ) : (
          <p>
            You have no favorite events. Add some from the{" "}
            <Link to="/events">Events</Link> page!
          </p>
        )}
      </div>
      <div>
        <h2>Shows You've Contacted</h2>
        {contactedEvents.length > 0 ? (
          contactedEvents.map((event) => (
            <div key={event.id}>
              <h3>{event.title}</h3>
              <p>{event.genre}</p>
              <p>Start: {event.start.toLocaleString()}</p>
              <p>End: {event.end.toLocaleString()}</p>
              <p>Description: {event.description}</p>
              <p>Location: {event.location}</p>
              <p>Capacity: {event.capacity}</p>
              <p>Event Flyer:</p>
              {event.photoURL && (
                <img
                  src={event.photoURL}
                  alt="Event"
                  style={{ maxWidth: "10%", height: "auto" }}
                />
              )}
              <p>
                Created by:{" "}
                <Link
                  to={`/user/${event.uid}`}
                  style={{ textDecoration: "underline" }}
                >
                  {event.username}
                </Link>
              </p>
              <button
                onClick={() => {
                  setIsEmailModalOpen(true);
                  setSelectedEvent(event); // Assuming you have a state to hold the selected event
                }}
              >
                Send a Booking
              </button>
              <button onClick={() => handleAddToGoogleCalendar(event)}>
                Add to Google Calendar
              </button>
            </div>
          ))
        ) : (
          <p>You haven't contacted any shows yet.</p>
        )}
      </div>
      {editEventId && (
        <EventForm
          onSave={handleSave}
          onDelete={handleEventDelete}
          event={events.find((event) => event.id === editEventId)}
        />
      )}
    </div>
  );
};

export default MyEventsPage;
