import React, { useState, useEffect } from "react";
import emailjs from "emailjs-com";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
import { firestore, storage } from "../components/firebase/firebaseConfig";
import { useNavigate, useParams, Link } from "react-router-dom";
import { gapi } from "gapi-script";
import { useAuth } from "../components/firebase/AuthContext";

const EmailModal = ({
  isOpen,
  onClose,
  event,
  profileData,
  creatorEmail,
  setNotification,
}) => {
  const [userDetails, setUserDetails] = useState({
    name: "",
    userMessage: "",
  });

  const [error, setError] = useState(""); // State to store fetching errors
  const { currentUser } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const navigate = useNavigate();
  const { eventId } = useParams(); // Obtains event Id based on event parameters
  const [eventDetails, setEventDetails] = useState(null);
  const [emailSent, setEmailSent] = useState(false); // State to track if the email has been sent
  const getDirectionsUrl = (event) => {
    const { lat, lng } = event;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  const addToContactedEvents = async (event) => {
    if (!currentUser) {
      alert("Please log in to contact about an event.");
      return;
    }

    if (!selectedEvent) {
      alert("No event selected to contact about.");
      return;
    }

    const contactedEventsRef = collection(firestore, "contactedEvents");
    try {
      const q = query(
        contactedEventsRef,
        where("eventId", "==", event.id),
        where("uid", "==", currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        await addDoc(contactedEventsRef, {
          uid: currentUser.uid,
          eventId: event.id,
          timestamp: Timestamp.now(),
        });
        console.log("Event contact has been noted in Firestore.");
        alert("Event contact has been noted!");
      } else {
        alert("You have already contacted about this event.");
      }
    } catch (error) {
      console.error("Error adding event to contacted events: ", error);
      alert("Failed to note event contact.");
    }
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
          // Update the creatorEmail directly from the event data
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserDetails((prevDetails) => ({ ...prevDetails, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailSent(false); // Resets email sent status each time the form is submitted
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
      user_email: userDetails.email,
      user_username: userDetails.username,
      user_message: userDetails.userMessage,
      to_email: event?.email,
    };

    // EmailJS service used to send users email, in future I will hide these in env. for security
    emailjs
      .send(
        "service_hmbss4p",
        "template_6huj8xr",
        emailParams,
        "qPX4lZbgV_2l9XtX7"
      )
      .then((result) => {
        console.log("Email successfully sent!");
        setUserDetails({ name: "", userMessage: "" }); // Resets user input fields
        onClose(); // Close the modal
        setEmailSent(
          "Email successfully sent! Please check your emails to see if you've been contacted by the organiser."
        ); // Set email sent status to true
        setNotification({
          show: true,
          message: "Email successfully sent!",
          type: "success",
        });
        setTimeout(
          () => setNotification({ show: false, message: "", type: "" }),
          5000
        );
      })
      .catch((error) => {
        console.error("Failed to send email:", error);
        // Trigger an error notification in the parent component
        setNotification({
          show: true,
          message: "Failed to send your message. Please try again.",
          type: "error",
        });

        // Saves the event contact information to Firestore to add to My Events Page
        addToContactedEvents();
      });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="email-modal-events-container">
        <div className="email-modal-header">
          <button
            onClick={() => {
              onClose();
              setEmailSent(false);
            }}
            className="close-button"
          >
            X
          </button>
        </div>
        <div className="email-modal-content">
          {event ? (
            <>
              <h2>{event.title}</h2>
              <p>Genre: {event.genre}</p>
              <p>Start: {new Date(event.start).toLocaleString()}</p>
              <p>End: {new Date(event.end).toLocaleString()}</p>
              <p>Description: {event.description}</p>
              <p>Location: {event.location}</p>
              <p>
                <a
                  href={getDirectionsUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Directions 📍
                </a>
              </p>
            </>
          ) : (
            <p>Loading event details...</p>
          )}
          <p>
            Created by:{" "}
            <Link
              to={`/user/${event.uid}`}
              style={{ textDecoration: "underline" }}
            >
              {event.username}
            </Link>{" "}
          </p>
          {typeof emailSent === "string" && <p>{emailSent}</p>}
          <h4 className="form-group">Fill out contact form:</h4>
          <form onSubmit={handleSubmit} className="form-group">
            <label>
              Your Contact Email:
              <input
                type="email"
                name="email"
                value={userDetails.email}
                onChange={handleChange}
                placeholder="Your Contact Email"
                className="input-text"
                required
              />
            </label>
            <label>
              Your Username:
              <input
                type="text"
                name="username"
                value={userDetails.username}
                onChange={handleChange}
                placeholder="Your Username"
                className="input-text"
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
                className="textarea"
                required
              />
            </label>
            <button type="submit" className="button">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
