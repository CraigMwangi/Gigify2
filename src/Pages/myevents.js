import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";
import { useAuth } from "../components/firebase/AuthContext";
import EditEventModal from "./editModal";
import EmailModal from "./emailModal";
import { ref, deleteObject, getStorage } from "firebase/storage";

const MyEventsPage = () => {
  const { currentUser } = useAuth();
  const [createdEvents, setCreatedEvents] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [contactedEvents, setContactedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editEventId, setEditEventId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();
  const storage = getStorage();

  // Fetch events created by the user
  useEffect(() => {
    if (!currentUser) return;
    const eventsRef = collection(firestore, "events");
    const q = query(eventsRef, where("uid", "==", currentUser.uid));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedEvents = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCreatedEvents(fetchedEvents);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching created events:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch favorites from user
  useEffect(() => {
    if (!currentUser) return;
    const favoritesRef = collection(firestore, "favorites");
    const q = query(favoritesRef, where("uid", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const favEvents = [];
      querySnapshot.forEach(async (docSnapshot) => {
        const eventData = await getDoc(
          doc(firestore, "events", docSnapshot.data().eventId)
        );
        if (eventData.exists()) {
          favEvents.push({ id: eventData.id, ...eventData.data() });
        }
      });
      setFavorites(favEvents);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch contacted events
  useEffect(() => {
    if (!currentUser) return;
    const contactedEventsRef = collection(firestore, "contactedEvents");
    const q = query(contactedEventsRef, where("uid", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const contacted = [];
      querySnapshot.forEach(async (docSnapshot) => {
        const eventData = await getDoc(
          doc(firestore, "events", docSnapshot.data().eventId)
        );
        if (eventData.exists()) {
          contacted.push({ id: eventData.id, ...eventData.data() });
        }
      });
      setContactedEvents(contacted);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Edit event logic
  const handleEditClick = (eventId) => {
    setEditEventId(eventId);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditEventId(null);
  };

  const handleOpenEmailModal = (event) => {
    setSelectedEvent(event);
    setIsEmailModalOpen(true);
  };

  const handleSeeEvent = () => {
    navigate(`/events`);
  };

  const handleSave = async (updatedEvent) => {
    const eventRef = doc(firestore, "events", updatedEvent.id);
    try {
      await updateDoc(eventRef, updatedEvent);
      setIsEditModalOpen(false);
      console.log("Event updated successfully!");
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const handleDelete = (eventId) => {
    setCreatedEvents((prevEvents) =>
      prevEvents.filter((event) => event.id !== eventId)
    );
    handleCloseModal();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container">
      <h2 className="centre-text">My Created Events</h2>
      <p className="centre-text">Find all the events you've made here.</p>
      {createdEvents.map((event) => (
        <div key={event.id} className="myevents-sub-content">
          <h3 className="centre-text">{event.title}</h3>
          <button onClick={() => handleEditClick(event.id)} className="button">
            Edit
          </button>
        </div>
      ))}
      <h2 className="centre-text">My Favourite Events</h2>
      {favorites.length > 0 ? (
        favorites.map((event) => (
          <div key={event.id}>
            <h3>{event.title}</h3>
            <p>{event.genre}</p>
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
            <button onClick={() => handleSeeEvent(event.id)} className="button">
              See Event
            </button>
          </div>
        ))
      ) : (
        <p className="centre-text">
          You haven't favorited any shows yet.{" "}
          <Link to="/events">Go to Events!</Link>
        </p>
      )}
      <h2 className="centre-text">Contacted Shows</h2>
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
              onClick={() => handleOpenEmailModal(event)}
              className="button"
            >
              Send Message
            </button>
            <button
              onClick={() => {
                setSelectedEvent(event);
                setIsEmailModalOpen(true);
              }}
              className="button"
            >
              Send Message
            </button>
          </div>
        ))
      ) : (
        <p className="centre-text">
          You haven't contacted any shows yet.{" "}
          <Link to="/events">Go to Events!</Link>
        </p>
      )}
      {editEventId && isEditModalOpen && (
        <EditEventModal
          isOpen={isEditModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={handleDelete}
          event={createdEvents.find((e) => e.id === editEventId)}
        />
      )}
      {selectedEvent && isEmailModalOpen && (
        <EmailModal isOpen={isEmailModalOpen} event={selectedEvent} />
      )}
    </div>
  );
};

export default MyEventsPage;
