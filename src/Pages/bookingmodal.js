import React, { useState } from "react";
import Modal from "react-modal";

// Ensure you set the app element for accessibility reasons
Modal.setAppElement("#root");

const BookingModal = ({
  isOpen,
  onRequestClose,
  genreNightArtists, // Make sure this prop is correctly passed from the parent component
  onSendMessages, // This function needs to be implemented in the parent component
}) => {
  const [message, setMessage] = useState("");
  const [genreNightDetails, setGenreNightDetails] = useState({
    genre: "",
    acts: "",
    location: "",
    date: "",
    time: "",
  });
  const [availableArtists, setAvailableArtists] = useState([]);
  const fetchAvailableArtists = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fetchedArtists = await fetchAvailableArtists(genreNightDetails);
    setAvailableArtists(fetchedArtists);
    onSendMessages(message); // Assuming this function sends the message to all selected artists
    onRequestClose(); // Close the modal after sending the message
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
      <h2>Send a Message for your Genre Night</h2>
      <form onSubmit={handleSubmit}>
        <form onSubmit={handleSubmit}>
          <label>
            Genre:
            <input
              type="text"
              value={genreNightDetails.genre}
              onChange={(e) =>
                setGenreNightDetails({
                  ...genreNightDetails,
                  genre: e.target.value,
                })
              }
            />
          </label>
          <label>
            Number of Acts:
            <input
              type="number"
              value={genreNightDetails.acts}
              onChange={(e) =>
                setGenreNightDetails({
                  ...genreNightDetails,
                  acts: e.target.value,
                })
              }
            />
          </label>
          <label>
            Location:
            <input
              type="text"
              value={genreNightDetails.location}
              onChange={(e) =>
                setGenreNightDetails({
                  ...genreNightDetails,
                  location: e.target.value,
                })
              }
            />
          </label>
          <label>
            Date:
            <input
              type="date"
              value={genreNightDetails.date}
              onChange={(e) =>
                setGenreNightDetails({
                  ...genreNightDetails,
                  date: e.target.value,
                })
              }
            />
          </label>
          <label>
            Time:
            <input
              type="time"
              value={genreNightDetails.time}
              onChange={(e) =>
                setGenreNightDetails({
                  ...genreNightDetails,
                  time: e.target.value,
                })
              }
            />
          </label>
          {/* Message textarea and buttons remain the same */}
        </form>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here"
        />
        <button type="submit">Send Message</button>
        <button onClick={onRequestClose}>Close</button>
      </form>
    </Modal>
  );
};

export default BookingModal;
