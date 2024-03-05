import React, { useState } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import EmailModal from "./emailModal";

const mapContainerStyle = {
  width: "100vw",
  height: "60vh",
};

const defaultCenter = {
  lat: 54.7024, // Latitude for the center of the UK
  lng: -3.2766, // Longitude for the center of the UK
};

const MapComponent = ({ events, apiKey }) => {
  // Filtering events to ensure they have valid lat and lng for mapping
  const validEvents = events.filter((event) => event.lat && event.lng);

  const [loadScriptError, setLoadScriptError] = useState(false);

  const handleLoadScriptError = () => {
    // Handle load script error
    setLoadScriptError(true);
  };

  const center =
    validEvents.length > 0
      ? { lat: validEvents[0].lat, lng: validEvents[0].lng }
      : defaultCenter;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleMarkerClick = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      onError={handleLoadScriptError} // Handle load script error
    >
      {!loadScriptError ? (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={5}
        >
          {events.map((event) => (
            <Marker
              key={event.id}
              position={{ lat: event.lat, lng: event.lng }}
              onClick={() => handleMarkerClick(event)}
            />
          ))}
        </GoogleMap>
      ) : (
        <div>
          <p>Failed to load the map. Please try again later.</p>
        </div>
      )}
      {isModalOpen && (
        <EmailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          event={selectedEvent}
          eventDetails={selectedEvent}
        />
      )}
    </LoadScript>
  );
};

export default MapComponent;
