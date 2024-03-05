import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
} from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";
import { useAuth } from "../components/firebase/AuthContext";
import { gapi } from "gapi-script";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import EventModal from "./eventModal";

const localizer = momentLocalizer(moment);

const UserAvailabilityPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [userCategory, setUserCategory] = useState("");
  const [formData, setFormData] = useState({
    maxTravelDistance: "",
    performanceStyle: "",
    preferredVenues: "",
    preferredStyles: "",
    ambience: "",
    disabilities: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  const initGoogleApi = () => {
    gapi.load("client:auth2", () => {
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
          const isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
          console.log(
            isSignedIn ? "The user is signed in." : "The user is not signed in."
          );
        });
    });
  };

  const fetchUserData = async () => {
    if (!currentUser) return;

    const userRef = doc(firestore, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) setUserCategory(userSnap.data().category);

    const userAvailabilityRef = doc(
      firestore,
      "userAvailability",
      currentUser.uid
    );
    const userAvailabilitySnap = await getDoc(userAvailabilityRef);
    if (userAvailabilitySnap.exists()) setFormData(userAvailabilitySnap.data());
  };

  const fetchEvents = async () => {
    if (!currentUser) return;

    const eventsRef = collection(
      firestore,
      `userEvents/${currentUser.uid}/events`
    );
    const snapshot = await getDocs(eventsRef);
    const fetchedEvents = snapshot.docs.map((doc) => ({
      ...doc.data(),
      start: new Date(doc.data().start.seconds * 1000),
      end: new Date(doc.data().end.seconds * 1000),
    }));
    setEvents(fetchedEvents.filter((event) => event.uid === currentUser.uid));
  };

  useEffect(() => {
    initGoogleApi();
    fetchUserData();
    fetchEvents();
  }, [currentUser]);

  const handleSelectSlot = ({ start, end }) => {
    setSelectedSlot({ start, end });
    setIsModalOpen(true);
  };

  const saveEvent = async (eventDetails) => {
    const { title, start, end, location, genre, description } = eventDetails;
    const newEvent = {
      uid: currentUser.uid, // Add UID to the event
      title,
      start: firestore.Timestamp.fromDate(new Date(start)),
      end: firestore.Timestamp.fromDate(new Date(end)),
      location,
      genre,
      description,
    };
    await addDoc(
      collection(firestore, `userEvents/${currentUser.uid}/events`),
      newEvent
    );
    setEvents([...events, newEvent]);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(
        doc(firestore, "userAvailability", currentUser.uid),
        formData
      );
      alert("Availability updated successfully!");
      navigate(`/user-profile/${currentUser.uid}`);
    } catch (error) {
      console.error("Error updating availability:", error);
      alert("Failed to update availability.");
    }
  };

  const handleGoogleCalendarAuth = () => {
    const authInstance = gapi.auth2.getAuthInstance();
    if (authInstance.isSignedIn.get()) {
      // If already signed in, open Google Calendar directly
      window.open("https://calendar.google.com/calendar/", "_blank");
    } else {
      // Sign in and request permissions
      authInstance
        .signIn()
        .then(() => {
          // After signing in, the updateSigninStatus callback will handle opening the calendar
        })
        .catch((error) => {
          console.error("Error signing in or authorizing: ", error);
        });
    }
  };

  const goToGoogleCalendar = () => {
    window.open("https://calendar.google.com/calendar/", "_blank");
  };
  return (
    <div>
      <h2>Update Your Availability</h2>
      <p>Please state the title of the event as the Genre.</p>
      <button onClick={handleGoogleCalendarAuth}>
        Authorize Google Calendar
      </button>
      <button onClick={goToGoogleCalendar}>Go to Google Calendar</button>
      <div>
        <h2>Your Calendar</h2>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 500 }}
          selectable
          onSelectSlot={handleSelectSlot}
        />
        <EventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={saveEvent}
        />
        {/* Add other UI components for managing events */}
      </div>
      <form onSubmit={handleSubmit}>
        <p>Max Travel Distance (miles):</p>
        <input
          name="maxTravelDistance"
          type="number"
          onChange={handleChange}
          value={formData.maxTravelDistance || ""}
          placeholder="Max Travel Distance"
          required
        />

        {userCategory === "Musician" && (
          <>
            <p>Performance Style:</p>
            <input
              name="performanceStyle"
              onChange={handleChange}
              value={formData.performanceStyle || ""}
              placeholder="Performance Style"
              required={userCategory === "Musician"}
            />
            <p>Preferred Venues:</p>
            <input
              name="preferredVenues"
              onChange={handleChange}
              value={formData.preferredVenues || ""}
              placeholder="Preferred Venues"
              required={userCategory === "Musician"}
            />
          </>
        )}

        {userCategory === "Venue" && (
          <>
            <p>Preferred Styles:</p>
            <input
              name="preferredStyles"
              onChange={handleChange}
              value={formData.preferredStyles || ""}
              placeholder="Preferred Styles"
              required={userCategory === "Venue"}
            />
            <p>Ambience:</p>
            <input
              name="ambience"
              onChange={handleChange}
              value={formData.ambience || ""}
              placeholder="Ambience"
              required={userCategory === "Venue"}
            />
          </>
        )}

        <p>Please outline any disabilities:</p>
        <input
          name="disabilities"
          onChange={handleChange}
          value={formData.disabilities || ""}
          placeholder="Disabilities"
        />

        <button onClick={handleSubmit}>Submit</button>
      </form>
    </div>
  );
};

export default UserAvailabilityPage;
