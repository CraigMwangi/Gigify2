import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { gapi } from "gapi-script";
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";
import { useAuth } from "../components/firebase/AuthContext";
import EventModal from "./eventModal";
import EmailModal from "./emailModal";

const EventsPage = () => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({
    location: "",
    genre: "",
    date: "",
    time: "",
    capacity: "",
  });
  const [filteredEvents, setFilteredEvents] = useState([]);
  const resetFilters = () => {
    setFilters({
      location: "",
      genre: "",
      date: "",
      capacity: "",
    });
    // Optionally reset filtered events to show all events again
    setFilteredEvents(events);
  };
  const createNotification = async (eventId, creatorId) => {
    const notificationsRef = collection(firestore, "notifications");
    const notification = {
      receiverId: creatorId,
      message: `Your event (${eventId}) has been favorited by another user.`,
      read: false,
      createdAt: new Date(),
    };

    try {
      await addDoc(notificationsRef, notification);
    } catch (error) {
      console.error("Error creating notification: ", error);
    }
  };

  const navigate = useNavigate();

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const addToFavorites = async (event) => {
    if (!currentUser) {
      alert("Please log in to add favorites.");
      return;
    }

    const favoritesRef = collection(firestore, "favorites");
    const favorite = {
      eventId: event.id,
      uid: currentUser.uid,
    };

    try {
      const q = query(
        favoritesRef,
        where("eventId", "==", event.id),
        where("uid", "==", currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        await addDoc(favoritesRef, favorite);
        alert("Event added to favorites!");

        // Check if the event's creator is different from the current user
        if (event.uid !== currentUser.uid) {
          // Create a notification for the event's creator
          await createNotification(event.id, event.uid);
        }
      } else {
        alert("This event is already in your favorites.");
      }
    } catch (error) {
      console.error("Error adding event to favorites: ", error);
      alert("Failed to add event to favorites.");
    }
  };

  // Function to apply filters
  const applyFilters = () => {
    setFilteredEvents(
      events.filter((event) => {
        return (
          (!filters.location || event.location.includes(filters.location)) &&
          (!filters.genre || event.genre === filters.genre) &&
          (!filters.date ||
            new Date(event.start).toDateString() ===
              new Date(filters.date).toDateString()) &&
          (!filters.capacity || event.capacity >= filters.capacity)
        );
        // Implement time filter as needed
      })
    );
  };

  useEffect(() => {
    if (!currentUser) {
      setError("Please log in to view events.");
      setLoading(false);
      return;
    }

    loadGoogleApi();
  }, [currentUser]);

  const loadGoogleApi = () => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      gapi.load("client:auth2", initClient);
    };
    document.body.appendChild(script);
  };

  const initClient = () => {
    gapi.client
      .init({
        apiKey: "AIzaSyDfNCiZBEE0pxF-7O8Tb7U7HWSPefje50Q",
        clientId:
          "556828166349-jjodibfl9b6g3djt6r0hq93go56qjprr.apps.googleusercontent.com",
        discoveryDocs: [
          "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
        ],
        scope: "https://www.googleapis.com/auth/calendar",
      })
      .then(() => {
        fetchEvents();
      })
      .catch((error) => {
        console.error("Error loading GAPI client for API", error);
        setError("Failed to load Google API client");
      });
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Initialize empty arrays for both event sources
      let googleCalendarEvents = [];
      let firestoreEvents = [];

      // Attempt to fetch events from both sources
      try {
        googleCalendarEvents = await fetchGoogleCalendarEvents();
      } catch (googleError) {
        console.error("Error fetching Google Calendar events:", googleError);
        // Optionally set an error state or log this error
      }

      try {
        firestoreEvents = await fetchFirestoreEvents();
      } catch (firestoreError) {
        console.error("Error fetching Firestore events:", firestoreError);
        // Optionally set an error state or log this error
      }

      // Combine both arrays, ensuring that even if one fails, the other's events are still set
      setEvents([...googleCalendarEvents, ...firestoreEvents]);
    } catch (error) {
      console.error("Error fetching events:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleCalendarEvents = async () => {
    try {
      const response = await gapi.client.calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: "startTime",
      });

      const items = response.result.items;
      // Filter events based on the custom identifier in the description
      const filteredItems = items.filter(
        (item) => item.summary && item.summary.startsWith("[AppEvent]")
      );
      // Alternatively, if using extended properties:
      // const filteredItems = items.filter(item => item.extendedProperties && item.extendedProperties.private.appIdentifier === "YourAppIdentifier");

      return filteredItems.map((event) => ({
        id: event.id,
        title: event.summary,
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date),
        description: event.description || "",
        location: event.location || "Location not provided",
      }));
    } catch (error) {
      console.error("Error fetching Google Calendar events:", error);
      throw new Error("Failed to fetch Google Calendar events.");
    }
  };

  const fetchFirestoreEvents = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, "events"));
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          genre: data.genre,
          description: data.description,
          location: data.location,
          start:
            data.start instanceof Timestamp
              ? data.start.toDate()
              : new Date(data.start),
          end:
            data.end instanceof Timestamp
              ? data.end.toDate()
              : new Date(data.end),
          username: data.username, // Include username
          uid: data.uid,
          email: data.email,
          photoURL: data.photoURL, // Include uid for navigation to profile
        };
      });
    } catch (error) {
      console.error("Error fetching Firestore events:", error);
      throw new Error("Failed to fetch Firestore events.");
    }
  };

  const handleEmailModalSubmit = async (event) => {
    if (!currentUser) {
      alert("Please log in to contact about an event.");
      return;
    }

    const contactedEventsRef = collection(firestore, "contactedEvents");
    const contactedEvent = {
      eventId: selectedEvent.id,
      uid: currentUser.uid,
      creatorEmail: event.email,
    };

    try {
      await addDoc(contactedEventsRef, contactedEvent);
      alert("Event contact has been noted!");
    } catch (error) {
      console.error("Error noting event contact: ", error);
      alert("Failed to note event contact.");
    }
  };

  const handleSeeEvent = (eventId) => {
    navigate(`/event/${eventId}`); // Navigate to the event details page
  };

  const saveEventToFirestore = async (eventDetails) => {
    setLoading(true);
    try {
      // Query Firestore for an event with matching details
      const eventsRef = collection(firestore, "events");
      const q = query(
        eventsRef,
        where("title", "==", eventDetails.title),
        where("start", "==", eventDetails.start),
        where("end", "==", eventDetails.end)
      );

      const querySnapshot = await getDocs(q);

      // Proceed to add the event to Firestore only if it doesn't already exist
      if (querySnapshot.empty) {
        await addDoc(eventsRef, eventDetails);
        alert("Event saved successfully");
      } else {
        alert("This event already exists in your events.");
      }
    } catch (err) {
      console.error("Error saving event to Firestore:", err);
      setError("Failed to save event.");
    } finally {
      setLoading(false);
    }
  };

  const saveEventToGoogleCalendar = async (eventDetails) => {
    const event = {
      summary: eventDetails.title,
      location: eventDetails.location,
      description: eventDetails.description,
      start: {
        dateTime: new Date(eventDetails.start).toISOString(),
        timeZone: "Europe/London", // Adjusted for UK timezone
      },
      end: {
        dateTime: new Date(eventDetails.start).toISOString(),
        timeZone: "Europe/London", // Adjusted for UK timezone
      },
    };

    if (gapi.client && gapi.client.calendar) {
      gapi.client.calendar.events
        .insert({
          calendarId: "primary",
          resource: event,
        })
        .then((response) => {
          // Handle response here - e.g., updating state or showing a message to the user
          console.log("Event created: ", response);
        })
        .catch((error) => {
          console.error("Error creating Google Calendar event: ", error);
        });
    }
  };

  const handleCreateNewEvent = async (eventDetails) => {
    setLoading(true);
    try {
      // Assuming saveEventToFirestore and saveEventToGoogleCalendar
      // are async functions that return a promise
      await saveEventToFirestore(eventDetails);
      await saveEventToGoogleCalendar(eventDetails);

      // Call fetchEvents to refresh the list of events displayed
      await fetchEvents(); // Ensure fetchEvents is defined and callable

      alert("Event saved successfully");
    } catch (error) {
      console.error("Error creating new event: ", error);
      setError("Failed to create new event.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshEvents = async () => {
    // Logic to fetch the latest events from Firestore/Google Calendar
    // and update the state
    try {
      const updatedEvents = await fetchEvents(); // Assuming fetchEvents is your function to fetch events
      setEvents(updatedEvents); // Assuming you have a useState hook managing events
    } catch (error) {
      console.error("Failed to refresh events:", error);
    }
  };

  const handleAddToGoogleCalendar = async (event, eventId) => {
    // Construct the URL for the event details page using the event's ID
    // Assuming your application's domain and routing are correctly set up
    const eventDetailsUrl = `http://localhost:3000/event/${eventId}`; // Use 'https' in production

    // Define the event object for Google Calendar
    // Include the URL in the description for direct navigation
    const googleEvent = {
      summary: `[AppEvent] ${event.title}`,
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
          genre: event.genre, // Store the genre in extendedProperties
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

  const handleSaveToUserAvailability = async (event) => {
    // Define the event object to save, excluding undefined fields
    const firestoreEvent = {
      title: event.title,
      start: event.start,
      end: event.end,
      description: event.description,
      location: event.location,
    };

    // Only add the genre field if it's defined
    if (event.genre) {
      firestoreEvent.genre = event.genre;
    }

    // Add to Firestore's userAvailability collection
    try {
      await addDoc(collection(firestore, "userAvailability"), firestoreEvent);
      alert("Event saved to your availability");
    } catch (error) {
      console.error("Error saving event to Firestore:", error);
      alert("Failed to save event to your availability");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Filter Events</h2>
      <div>
        <input
          type="text"
          name="location"
          placeholder="Location"
          value={filters.location}
          onChange={handleFilterChange}
        />
        <input
          type="text"
          name="genre"
          placeholder="Genre"
          value={filters.genre}
          onChange={handleFilterChange}
        />
        <input
          type="date"
          name="date"
          placeholder="Date"
          value={filters.date}
          onChange={handleFilterChange}
        />
        <input
          type="number"
          name="capacity"
          placeholder="Minimum Capacity"
          value={filters.capacity}
          onChange={handleFilterChange}
        />
        <button onClick={applyFilters}>Apply Filters</button>
        <button onClick={resetFilters}>Reset Filters</button>
      </div>
      <h2>Upcoming Events</h2>
      <button onClick={() => setIsModalOpen(true)}>Create New Event</button>
      <div>
        <ul>
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              // Event list item
              <li key={event.id}>
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
              </li>
            ))
          ) : (
            <p></p>
          )}
        </ul>
        {events.length > 0 && (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
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
                <button onClick={() => addToFavorites(event)}>Favorite</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        event={selectedEvent} // Pass selected event details to the modal
        onSave={handleEmailModalSubmit}
      />
      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleRefreshEvents}
      />
    </div>
  );
};

export default EventsPage;
