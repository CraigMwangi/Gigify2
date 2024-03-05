import React, { useState, useEffect } from "react";
import { storage } from "../components/firebase/firebaseConfig"; // Ensure you've configured Firebase Storage
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { deleteDoc, doc } from "firebase/firestore"; // For Firestore document deletion
import { deleteObject } from "firebase/storage"; // For Firebase Storage file deletion
import { firestore } from "../components/firebase/firebaseConfig";

const EventForm = ({ onSave, onDelete, event = null }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start: "",
    end: "",
    location: "",
    capacity: "",
    photo: null,
    photoURL: "",
  });

  useEffect(() => {
    if (event) {
      // Convert Timestamp to Date if necessary, then to the ISO string format
      const start =
        event.start instanceof Date ? event.start : new Date(event.start);
      const end = event.end instanceof Date ? event.end : new Date(event.end);

      // Format dates to YYYY-MM-DDThh:mm for datetime-local input fields
      setFormData({
        ...event,
        start,
        end,
        photo: null, // Don't pre-fill the file input
      });
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData((prevState) => ({ ...prevState, photo: files[0] }));
    } else {
      setFormData((prevState) => ({ ...prevState, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let dataToSave = { ...formData };
    if (formData.photo) {
      const photoRef = ref(storage, `eventPhotos/${formData.photo.name}`);
      const snapshot = await uploadBytes(photoRef, formData.photo);
      const photoURL = await getDownloadURL(snapshot.ref);
      dataToSave = { ...formData, photoURL };
    }
    onSave(dataToSave);
  };

  const handleDelete = async () => {
    if (!event) return; // Guard clause if no event is passed

    // Confirm deletion with the user
    if (window.confirm("Are you sure you want to delete this event?")) {
      // Delete the event document from Firestore
      await deleteDoc(doc(firestore, "events", event.id));

      // If there's a photoURL, delete the photo from Firebase Storage
      if (event.photoURL) {
        const photoRef = ref(storage, event.photoURL); // Ensure this path matches how you store/retrieve the URL
        await deleteObject(photoRef);
      }

      onDelete(); // Call the onDelete prop function to handle any post-deletion logic (like refreshing the list of events)
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Title:
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Genre:
        <input
          type="text"
          name="genre"
          value={formData.genre}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        From:
        <input
          type="datetime-local"
          name="start"
          value={formData.start}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Till:
        <input
          type="datetime-local"
          name="end"
          value={formData.end}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Location:
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Description:
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Capacity:
        <input
          type="number"
          name="capacity"
          value={formData.capacity}
          onChange={handleChange}
          required
        />
      </label>
      <input type="file" name="photo" onChange={handleChange} />
      {event && (
        <button type="button" onClick={handleDelete}>
          Delete Event
        </button>
      )}
      <button type="submit">{event ? "Update Event" : "Create Event"}</button>
    </form>
  );
};

export default EventForm;
