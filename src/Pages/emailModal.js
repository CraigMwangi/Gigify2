import React, { useState, useEffect } from "react";
import emailjs from "emailjs-com";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { firestore, storage } from "../components/firebase/firebaseConfig";
import { useNavigate, useParams } from "react-router-dom";
import { gapi } from "gapi-script";

const EmailModal = ({ isOpen, onClose, event, profileData, creatorEmail }) => {
  const [userDetails, setUserDetails] = useState({
    name: "",
    userMessage: "", // Renamed to avoid confusion with event description
  });

  const [events, setEvents] = useState([]); // State to store fetched events
  const [error, setError] = useState(""); // State to store fetching errors

  const navigate = useNavigate();
  const { eventId } = useParams();
  const { uid } = useParams();
  const [eventDetails, setEventDetails] = useState(null);
  const [emailSent, setEmailSent] = useState(false); // New state to track if the email has been sent
  const getDirectionsUrl = (event) => {
    const { lat, lng } = event;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  const handleSeeEvent = (eventId) => {
    // Navigate to the event details page, assuming `event.id` is available
    navigate(`/events/`);
  };

  const handleShowEvent = (eventId) => {
    navigate(`/event/${eventId}`); // Navigate to the event details page
  };

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const docRef = doc(firestore, "events", eventId); // Use the eventId to get a specific event
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const eventData = docSnap.data();
          setEventDetails({
            ...eventData,
            start:
              eventData.start instanceof Timestamp
                ? eventData.start.toDate()
                : new Date(eventData.start),
            end:
              eventData.end instanceof Timestamp
                ? eventData.end.toDate()
                : new Date(eventData.end),
          });

          // Assuming the event's creator email is to be fetched from eventData directly
          // Update the creatorEmail directly from the event data
          // This step is critical for ensuring the correct email is used in communication
          setUserDetails((prev) => ({
            ...prev,
            creatorEmail: eventData.email,
          }));
        } else {
          console.error("No such event document!");
          setError("Failed to fetch event details.");
        }
      } catch (error) {
        console.error("Error fetching event or user details:", error);
        setError("Failed to fetch details.");
      }
    };

    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserDetails((prevDetails) => ({ ...prevDetails, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setEmailSent(false); // Reset email sent status each time the form is submitted
    const eventDetailsUrl = `http://localhost:3000/event/${eventId}`;
    const descriptionWithLink = `${
      event?.description || ""
    }\n\nView Event at: ${eventDetailsUrl}`;

    const emailParams = {
      event_title: event?.title || "",
      event_date: event?.start ? `${event.start.toLocaleDateString()}` : "N/A",
      event_genre: event?.genre || "",
      event_time:
        event?.start && event?.end
          ? `${event.start.toLocaleTimeString()} - ${event.end.toLocaleTimeString()}`
          : "N/A",
      event_description: descriptionWithLink,
      event_location: event?.location || "N/A",
      user_name: userDetails.name,
      user_message: userDetails.userMessage,
      to_email: event?.email,
    };

    // Replace 'YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', 'YOUR_USER_ID' with your actual EmailJS values
    emailjs
      .send(
        "service_hmbss4p",
        "template_6huj8xr",
        emailParams,
        "qPX4lZbgV_2l9XtX7"
      )
      .then(
        (result) => {
          console.log("Email successfully sent!");
          setUserDetails({ name: "", userMessage: "" }); // Reset user input fields
          onClose(); // Close the modal
          setEmailSent(true); // Set email sent status to true

          // Save the event contact information to Firestore
          const contactedEventsRef = collection(firestore, "contactedEvents");
          const contactedEvent = {
            eventId: event.id, // Assuming `event` prop has the event ID
            // uid: profileData.uid, // Assuming `profileData` prop has the current user's UID
            timestamp: Timestamp.now(),
          };

          addDoc(contactedEventsRef, contactedEvent)
            .then(() => {
              console.log("Event contact has been noted in Firestore!");
            })
            .catch((error) => {
              console.error("Error noting event contact in Firestore: ", error);
            });
        },
        (error) => {
          console.log("Failed to send email:", error);
        }
      );
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
      <button onClick={handleAddToGoogleCalendar}>
        Add to Google Calendar
      </button>
      <button onClick={() => handleSeeEvent(event.id)}>See Event</button>
      <div>
        {event ? (
          <>
            <p>Title: {event.title}</p>
            <p>Genre: {event.genre}</p>
            <p>Start: {new Date(event.start).toLocaleString()}</p>
            <p>End: {new Date(event.end).toLocaleString()}</p>
            <p>Description: {event.description}</p>
            <p>Location: {event.location}</p>
            <p>Creator's Email: {event.email}</p>
            <a
              href={getDirectionsUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Directions 📍
            </a>
          </>
        ) : (
          <p>Loading event details...</p>
        )}
        {emailSent && <p>Message sent!</p>}
        <form onSubmit={handleSubmit}>
          <label>
            Your Name:
            <input
              name="name"
              value={userDetails.name}
              onChange={handleChange}
              placeholder="Your Name"
              required
            />
          </label>
          <label>
            Your Message:
            <textarea
              name="userMessage"
              value={userDetails.userMessage}
              onChange={handleChange}
              placeholder="Hi, I would like to perform!"
              required
            />
          </label>
          <button type="submit">I'm Interested!</button>
          <button
            onClick={() => {
              onClose();
              setEmailSent(false);
            }}
          >
            Close
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmailModal;
