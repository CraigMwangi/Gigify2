import React, { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api"; // Dependencies to use Google Map API
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";
import MapModal from "./mapModal";

const containerStyle = {
  width: "100%",
  height: "60vh",
};

const defaultCenter = {
  lat: 54.7024,
  lng: -3.2766,
};

function EventMap() {
  const [events, setEvents] = useState([]);
  const [map, setMap] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const querySnapshot = await getDocs(collection(firestore, "events"));
      const eventsArray = [];
      querySnapshot.forEach((doc) => {
        if (doc.data().latLng) {
          eventsArray.push({
            ...doc.data(),
            id: doc.id,
          });
        }
      });
      setEvents(eventsArray);
    };

    fetchEvents();
  }, []);

  const onLoad = React.useCallback(
    function callback(map) {
      const bounds = new window.google.maps.LatLngBounds();
      events.forEach(({ latLng }) => bounds.extend(latLng));

      if (events.length > 0) {
        map.fitBounds(bounds);
      } else {
        map.setCenter(defaultCenter); // Center the map on UK if no events
        map.setZoom(5);
      }

      setMap(map);
    },
    [events]
  );

  const onUnmount = React.useCallback(function callback(map) {
    setMap(null);
  }, []);

  const handleMarkerClick = (event) => {
    setSelectedEvent(event); // Set the selected event when a marker is clicked
  };

  const closeMapModal = () => {
    setSelectedEvent(null); // Reset the selected event when the modal is closed
  };

  return (
    <LoadScript googleMapsApiKey="AIzaSyAJP4EUYo_UsOFFPFHiIjcwU_OI77GQhIQ">
      {" "}
      {/* API hard coded for functionality, in production I will hide this in env. file for security*/}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {events.map((event) => (
          <Marker
            key={event.id}
            position={event.latLng}
            onClick={() => handleMarkerClick(event)}
          />
        ))}
      </GoogleMap>
      {selectedEvent && (
        <MapModal
          isOpen={!!selectedEvent}
          onClose={closeMapModal}
          event={selectedEvent}
        />
      )}
    </LoadScript>
  );
}

export default EventMap;
