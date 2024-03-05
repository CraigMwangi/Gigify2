import React, { useState, useEffect } from "react";
import axios from "axios";
import { gapi } from "gapi-script";
import MapComponent from "./map.js";
import { firestore } from "../components/firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../components/firebase/AuthContext.js";
import EventModal from "./eventModal.js";

const GOOGLE_MAPS_API_KEY = "AIzaSyAJP4EUYo_UsOFFPFHiIjcwU_OI77GQhIQ"; // Use environment variable for API Key

function HomePage() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const { currentUser } = useAuth();

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
        return response.data.results[0].geometry.location;
      } else {
        console.error(
          "Geocoding failed for location:",
          location,
          "Status:",
          response.data.status
        );
        return null;
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  const fetchFirestoreEvents = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, "events"));
      const events = [];
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        let latLng = {};
        if (data.location && !data.lat && !data.lng) {
          latLng = await geocodeLocation(data.location);
        }
        events.push({
          id: doc.id,
          ...data,
          ...latLng,
        });
      }
      return events;
    } catch (error) {
      console.error("Error fetching Firestore events:", error);
      throw new Error("Failed to fetch Firestore events.");
    }
  };

  const fetchEvents = async () => {
    const querySnapshot = await getDocs(collection(firestore, "events"));
    const fetchedEvents = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    // Assuming each event has the necessary fields and geocoding has been handled prior
    setEvents(fetchedEvents);
  };

  useEffect(() => {
    fetchEvents(); // Initial fetch of events
  }, []);

  const fetchAndGeocodeGoogleCalendarEvents = async () => {
    try {
      const response = await gapi.client.calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: "startTime",
      });

      const eventsWithCoordsPromises = response.result.items.map(
        async (event) => {
          if (!event.location) {
            return null;
          }
          const coords = await geocodeLocation(event.location);
          return coords
            ? {
                id: event.id,
                title: event.summary,
                start: event.start.dateTime || event.start.date,
                end: event.end.dateTime || event.end.date,
                description: event.description || "",
                location: event.location,
                ...coords,
              }
            : null;
        }
      );

      return (await Promise.all(eventsWithCoordsPromises)).filter(
        (event) => event !== null
      );
    } catch (error) {
      console.error("Error fetching Google Calendar events:", error);
      throw new Error("Failed to fetch Google Calendar events.");
    }
  };

  const refreshEvents = async () => {
    // Fetch events from Firestore or update your local events state
    const updatedEvents = setEvents(updatedEvents); // fetch or update logic here
  };

  useEffect(() => {
    const initializeGoogleAPI = () => {
      gapi.load("client", async () => {
        try {
          await gapi.client.init({
            apiKey: "AIzaSyDfNCiZBEE0pxF-7O8Tb7U7HWSPefje50Q",
            clientId:
              "556828166349-jjodibfl9b6g3djt6r0hq93go56qjprr.apps.googleusercontent.com",
            discoveryDocs: [
              "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
            ],
          });
          const [firestoreEvents, googleCalendarEvents] = await Promise.all([
            fetchFirestoreEvents(),
            fetchAndGeocodeGoogleCalendarEvents(),
          ]);
          setEvents([...firestoreEvents, ...googleCalendarEvents]);
        } catch (error) {
          console.error(
            "Error initializing Google API or fetching events:",
            error
          );
          setError("Failed to initialize Google API or fetch events.");
        }
      });
    };
    initializeGoogleAPI();
  }, []);
  return (
    <div>
      <div>
        <h2>Find Your Sound!</h2>
        <p>Gigify is a platform that connects local musicians and venues.</p>
        <p>
          Musicians and Venues can create a profile and list their availability,
          genre, and location. Allowing you to search for local musicians &
          venues based on these criteria for gigs.
        </p>
        <p>
          The goal of the platform is to empower local musicians and venues by
          providing an intuitive platform that puts the power of booking in the
          musicians hands and for venues, making the process of finding acts or
          venues much easier with all the details and acts in one place.
        </p>
        <p>
          If you're a musician or venue, sign up and try Gigify for your next
          live music event!
        </p>
      </div>
      {error && <p>Error: {error}</p>}
      <MapComponent events={events} apiKey={GOOGLE_MAPS_API_KEY} />
      {/* Your existing content */}
    </div>
  );
}

export default HomePage;
