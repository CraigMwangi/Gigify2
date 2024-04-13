import React, { useState, useEffect } from "react";
import { firestore, storage } from "../components/firebase/firebaseConfig";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";

const EditEventModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event = null,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start: "",
    end: "",
    location: "",
    capacity: "",
    photo: null,
    photoURL: "",
    genre: "",
  });

  useEffect(() => {
    // Sets the form data when the modal opens with an pre-existing event details
    if (event) {
      // Check if event.start is a Firestore Timestamp and converts it if necessary to avoid errors
      const start =
        event.start instanceof Timestamp
          ? event.start.toDate().toISOString().substring(0, 16)
          : new Date(event.start).toISOString().substring(0, 16);
      const end =
        event.end instanceof Timestamp
          ? event.end.toDate().toISOString().substring(0, 16)
          : new Date(event.end).toISOString().substring(0, 16);

      setFormData({
        ...event,
        start: start,
        end: end,
        photo: null, // Resets the photo field in case a new file needs to be uploaded
      });
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let dataToSave = { ...formData };
    delete dataToSave.photo; // Removes the photo file object from data to be saved

    // Handle photo upload if a new photo was selected
    if (formData.photo instanceof File) {
      const photoRef = ref(storage, `eventPhotos/${formData.photo.name}`);
      const snapshot = await uploadBytes(photoRef, formData.photo);
      const photoURL = await getDownloadURL(snapshot.ref);
      dataToSave.photoURL = photoURL;
    }

    // Updates the event document in Firestore
    const eventRef = doc(firestore, "events", event.id);
    await updateDoc(eventRef, dataToSave);
    onSave(dataToSave);
    onClose(); // Close the modal after saving
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      const eventRef = doc(firestore, "events", event.id);
      await deleteDoc(eventRef);

      // Deletes photo if it exists in storage
      if (event.photoURL) {
        const photoRef = ref(storage, event.photoURL);
        await deleteObject(photoRef);
      }

      onDelete(event.id); // Informs parent component to remove the event from the state
      onClose(); // Close the modal after deletion
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="email-modal-events-container">
        <div className="email-modal-header">
          <div className="email-modal-content">
            <h2>Edit Event</h2>
            <button onClick={onClose} className="close-button">
              X
            </button>
            <form onSubmit={handleSubmit} className="form-group">
              <label>
                Title:
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="input-text"
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
                  className="input-text"
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
                  className="input-text"
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
                  className="input-text"
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
                  className="input-text"
                  required
                />
              </label>
              <label>
                Description:
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="textarea"
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
                  className="input-text"
                  required
                />
              </label>
              <button type="submit" className="button">
                {event ? "Update Event" : "Create Event"}
              </button>
              {event && (
                <button type="button" onClick={handleDelete} className="button">
                  Delete Event
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditEventModal;
