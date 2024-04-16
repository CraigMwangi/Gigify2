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
  doc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";
import { useAuth } from "../components/firebase/AuthContext";
import EventModal from "./eventModal";
import EmailModal from "./emailModal";
import emailjs from "emailjs-com";

const EventsPage = () => {
  const { currentUser } = useAuth();
  const [userProfileData, setUserProfileData] = useState({});
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "", // Can be "success" or "error"
  });
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({
    eventname: "",
    location: "",
    genre: "",
    date: "",
    time: "",
    capacity: "",
  });
  const [filteredEvents, setFilteredEvents] = useState([]);
  const resetFilters = () => {
    setFilters({
      name: "",
      location: "",
      genre: "",
      date: "",
      capacity: "",
    });
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

  // Notification feature to inform user of successful or failed message send

  const Notification = ({ type, message }) => {
    if (!message) return null;

    const notificationStyle = {
      position: "fixed",
      top: "10px",
      right: "10px",
      border: "1px solid",
      borderColor: type === "success" ? "green" : "red",
      backgroundColor: type === "success" ? "#d4edda" : "#f8d7da",
      color: type === "success" ? "#155724" : "#721c24",
      padding: "10px",
      borderRadius: "5px",
      zIndex: 1000,
    };

    return <div style={notificationStyle}>{message}</div>;
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

  // Attach this function to some handler or useEffect depending on when you want to trigger it

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (currentUser?.uid) {
        const docRef = doc(firestore, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserProfileData(docSnap.data());
        } else {
          console.log("No such document!");
        }
      }
    };

    fetchUserProfile();
  }, [currentUser]);
  // Function to apply filters
  const applyFilters = () => {
    setFilteredEvents(
      events.filter((event) => {
        return (
          (!filters.name || event.title === filters.name) && // Check if the name filter is empty or matches
          (!filters.location || event.location.includes(filters.location)) && // Check if the location filter is empty or matches
          (!filters.genre || event.genre === filters.genre) && // Check if the genre filter is empty or matches
          (!filters.date ||
            new Date(event.start).toDateString() ===
              new Date(filters.date).toDateString()) && // Check if the date filter is empty or matches
          (!filters.capacity || event.capacity >= filters.capacity) // Check if the capacity filter is empty or matches
        );
      })
    );
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && events.length > 0) {
      // Scroll that runs after events have been loaded
      const eventId = hash.substring(1);
      const eventElement = document.getElementById(eventId);
      if (eventElement) {
        eventElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [events]); // Add events as a dependency

  useEffect(() => {
    if (!currentUser) {
      setError("Please log in to view events.");
      setLoading(false);
      return;
    }

    loadGoogleApi();
  }, [currentUser]);

  // Google Api to allow users to add to Google Calendar

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
      let firestoreEvents = [];

      try {
        firestoreEvents = await fetchFirestoreEvents();
      } catch (firestoreError) {
        console.error("Error fetching Firestore events:", firestoreError);
      }

      // Combines both arrays, ensuring that even if one fails, the other's events are still set
      setEvents([...firestoreEvents]);
    } catch (error) {
      console.error("Error fetching events:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFirestoreEvents = async () => {
    try {
      const now = new Date();
      const eventsRef = collection(firestore, "events");
      const q = query(
        eventsRef,
        where("end", ">", Timestamp.fromDate(now)),
        orderBy("end", "asc")
      );
      const querySnapshot = await getDocs(q);
      const eventsArray = querySnapshot.docs.map((doc) => {
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
          username: data.username,
          uid: data.uid,
          email: data.email,
          photoURL: data.photoURL,
          capacity: data.capacity,
        };
      });

      // Sort by the start date after fetching
      eventsArray.sort((a, b) => a.start.getTime() - b.start.getTime());

      return eventsArray;
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
      eventId: event.id,
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

  const handleRefreshEvents = async () => {
    try {
      const updatedEvents = await fetchEvents(); // Fetch the latest events
      if (updatedEvents && Array.isArray(updatedEvents)) {
        setEvents(updatedEvents);
        setFilteredEvents(updatedEvents); // Ensure filtered events are updated simultaneously
      }
    } catch (error) {
      console.error("Failed to refresh events:", error);
    }
  };

  const handleAddToGoogleCalendar = async (event, eventId) => {
    // Construct the URL for the event details page using the event's ID
    const eventDetailsUrl = `http://localhost:3000/event/${eventId}`; // URL to link to event on website from Google Calendar
    const eventTitleWithPrefix = `[AppEvent]${event.title}`; // Tagging the event with the idenifier

    // Define the event object for Google Calendar
    const googleEvent = {
      summary: eventTitleWithPrefix,
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

  // Function to accept event
  const acceptEvent = async (event) => {
    if (!currentUser) {
      alert("Please log in to accept events.");
      return;
    }

    // Update Firestore with acceptance details
    const acceptancesRef = collection(firestore, "eventAcceptances");
    const acceptance = {
      eventId: event.id,
      userId: currentUser.uid,
      acceptedAt: Timestamp.now(),
    };

    try {
      await addDoc(acceptancesRef, acceptance);
      console.log("Event acceptance recorded");
      // Inform the user of successful acceptance
    } catch (error) {
      console.error("Error recording event acceptance: ", error);
      alert("Failed to accept event.");
      return; // Exit if saving the acceptance fails
    }
    const eventDetailsUrl = `http://localhost:3000/event/${event.id}`;

    // Send notification email to event creator
    const emailParams = {
      to_email: event?.email, // Fetched email from event
      message: `Your event, ${event.title}, has been accepted by ${
        currentUser.username || "a user"
      }. You can contact them at ${currentUser.email}.`,
      event_title: event?.title || "",
      event_date: event?.start ? `${event.start.toLocaleDateString()}` : "N/A",
      event_genre: event?.genre || "",
      event_time:
        event?.start && event?.end
          ? `${event.start.toLocaleTimeString()} - ${event.end.toLocaleTimeString()}`
          : "N/A",
      event_description: `${
        event?.description || ""
      }\n\nView Event at: ${eventDetailsUrl}`,
      event_location: event?.location || "N/A",
      event_username: event?.username,
      user_username: userProfileData.username,
      user_email: userProfileData.email,
    };

    // EmailJS to send the email
    emailjs
      .send(
        "service_hmbss4p",
        "template_9ygxgck",
        emailParams,
        "qPX4lZbgV_2l9XtX7"
      )
      .then((result) => {
        setNotification({
          show: true,
          message: "Event successfully accepted!",
          type: "success",
        });
        setTimeout(
          () => setNotification({ show: false, message: "", type: "" }),
          5000
        );
      })
      .catch((error) => {
        setNotification({
          show: true,
          message: "Failed to send acceptance email.",
          type: "error",
        });
      });
  };

  // Adds new event to MyEvents Page
  const handleNewEventAdded = (newEvent) => {
    setEvents((prevEvents) => {
      const existingEventIndex = prevEvents.findIndex(
        (event) => event.id === newEvent.id
      );
      if (existingEventIndex > -1) {
        // Update the existing event
        const updatedEvents = [...prevEvents];
        updatedEvents[existingEventIndex] = newEvent;
        return updatedEvents;
      } else {
        // Add a new event
        return [...prevEvents, newEvent];
      }
    });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container">
      {notification.show && (
        <Notification type={notification.type} message={notification.message} />
      )}
      <h2 className="header-text">Filter Events</h2>
      <p className="centre-text">Use the filters to find upcoming events.</p>
      <div className="events-filter-content">
        <div className="input-group">
          <input
            type="text"
            name="eventname"
            placeholder="Event Name"
            value={filters.name}
            onChange={handleFilterChange}
          />
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
        </div>
        <div className="button-group">
          <button onClick={applyFilters} className="button">
            Apply Filters
          </button>
          <button onClick={resetFilters} className="button">
            Reset Filters
          </button>
        </div>
      </div>
      <p className="centre-text">
        Use the 'Create A Night' to create an event.
      </p>
      <button onClick={() => setIsEventModalOpen(true)} className="button">
        Create A Night
      </button>
      <h2 className="header-text">Upcoming Events</h2>
      <div className="event-filter-results">
        <ul>
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              // Event list item
              <li
                key={event.id}
                id={event.id}
                style={{
                  backgroundColor: "rgb(131, 131, 131)",
                  padding: "10px",
                  marginBottom: "10px",
                  borderRadius: "5px",
                }}
              >
                <h3>{event.title}</h3>
                <p>Genre: {event.genre}</p>
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
                  <Link to={`/user/${event.uid}`}>
                    Go to {event.username}'s profile
                  </Link>
                </p>
                <button
                  onClick={() => {
                    setIsEmailModalOpen(true);
                    setSelectedEvent(event);
                  }}
                  className="button"
                >
                  Send a Message
                </button>
                <button
                  onClick={() => handleAddToGoogleCalendar(event)}
                  className="button"
                >
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
              <li
                key={event.id}
                id={event.id}
                style={{
                  backgroundColor: "rgb(131, 131, 131)",
                  padding: "20px",
                  marginBottom: "10px",
                  borderRadius: "5px",
                }}
              >
                <h3>{event.title}</h3>
                <p>Genre: {event.genre}</p>
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
                  Created by:
                  <Link to={`/user/${event.uid}`} className="link-button">
                    Go to {event.username}'s profile
                  </Link>
                </p>

                <button
                  onClick={() => {
                    setIsEmailModalOpen(true);
                    setSelectedEvent(event);
                  }}
                  className="button"
                >
                  Send a Booking
                </button>
                <button
                  onClick={() => handleAddToGoogleCalendar(event)}
                  className="button"
                >
                  Add to Google Calendar
                </button>
                <button
                  onClick={() => addToFavorites(event)}
                  className="button"
                >
                  Favorite
                </button>
                <button onClick={() => acceptEvent(event)} className="button">
                  Accept Event
                </button>
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
        setNotification={setNotification}
      />
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleRefreshEvents}
        onEventCreated={handleNewEventAdded}
      />
    </div>
  );
};

export default EventsPage;
