import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig"; // Adjust the import path as necessary
// import "./style.css"; // Make sure the path to your CSS file is correct
import BookingModal from "./bookingmodal";

async function getCoordinatesForLocation(location) {
  const apiKey = "AIzaSyAJP4EUYo_UsOFFPFHiIjcwU_OI77GQhIQ"; // Replace with your Google Maps API key
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      location
    )}&key=${apiKey}`
  );
  const data = await response.json();
  if (data.results.length > 0) {
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  } else {
    throw new Error("Location not found");
  }
}

function SearchPage() {
  const [searchResults, setSearchResults] = useState([]);
  const uid = useParams();
  const [genreNightArtists, setGenreNightArtists] = useState([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    acts: "",
    location: "",
    genre: "",
    availabilityStart: "",
    availabilityEnd: "",
    maxTravelDistance: "", // New field for maximum travel distance
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  function getDistanceFromLatLonInMiles(lat1, lon1, lat2, lon2) {
    const R = 3959; // Radius of the earth in miles
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in miles
    return distance;
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  const handleSendMessages = (message) => {
    // Example logic to send a message to each artist
    genreNightArtists.forEach((artist) => {
      console.log(`Sending message to artist ${artist.id}: ${message}`);
      // Here you would implement the actual message sending logic,
      // for example, calling an API endpoint to send the message
    });

    // Optionally, clear the selected artists after sending the messages
    setGenreNightArtists([]);
  };

  const handleGenreNightBooking = async () => {
    // Assuming formData.acts is the number of acts to book
    const actsToBook = parseInt(formData.acts, 10);
    const selectedGenre = formData.genre;

    // Filter users by genre
    const genreFilteredUsers = searchResults.filter(
      (user) => user.genre === selectedGenre
    );

    // Randomly select a specified number of acts
    const randomSelection = genreFilteredUsers
      .sort(() => 0.5 - Math.random())
      .slice(0, actsToBook);

    setGenreNightArtists(randomSelection);
    setIsBookingModalOpen(true); // Open the modal to show selected artists and send messages
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let userCoordinates;
    try {
      // Get coordinates for the input location
      userCoordinates = await getCoordinatesForLocation(formData.location);
    } catch (error) {
      console.error("Error fetching location coordinates:", error);
      return;
    }

    // Start with a basic query
    let q = query(collection(firestore, "users"));

    if (formData.genre) {
      q = query(q, where("genre", "==", formData.genre));
    }

    // Additional filters
    if (formData.acts) {
      q = query(q, where("acts", "==", parseInt(formData.acts)));
    }

    try {
      const querySnapshot = await getDocs(q);

      const users = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      // Perform additional filtering for availabilityStart and availabilityEnd locally
      const filteredUsers = users.filter((user) => {
        if (
          formData.availabilityStart &&
          formData.availabilityEnd &&
          user.availabilityDates
        ) {
          return user.availabilityDates.some(
            (date) =>
              date.start >= formData.availabilityStart &&
              date.end <= formData.availabilityEnd
          );
        }
        return true;
      });

      // Filter users based on distance
      const filteredByDistance = filteredUsers.filter((user) => {
        if (!user.coordinates) return false; // Skip users without coordinates
        const distance = getDistanceFromLatLonInMiles(
          userCoordinates.lat,
          userCoordinates.lng,
          user.coordinates.lat,
          user.coordinates.lng
        );
        return distance <= formData.maxTravelDistance;
      });

      setSearchResults(filteredByDistance);
    } catch (error) {
      console.error("Error fetching users:", error);
      // Optionally set an error state here to inform the user
    }
  };

  return (
    <div className="main-content">
      <div className="search-form">
        <h2>Search Musicians or Venues</h2>
        <form id="searchForm" onSubmit={handleSubmit}>
          <label htmlFor="location">Location:</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
          />

          <label htmlFor="maxTravelDistance">
            Max Travel Distance (miles):
          </label>
          <input
            type="number"
            id="maxTravelDistance"
            name="maxTravelDistance"
            min="1"
            value={formData.maxTravelDistance}
            onChange={handleChange}
          />

          <label htmlFor="genre">Genre:</label>
          <input
            type="text"
            id="genre"
            name="genre"
            value={formData.genre}
            onChange={handleChange}
          />

          <label htmlFor="availabilityStart">Availability Start:</label>
          <input
            type="date"
            id="availabilityStart"
            name="availabilityStart"
            value={formData.availabilityStart}
            onChange={handleChange}
          />

          <label htmlFor="availabilityEnd">Availability End:</label>
          <input
            type="date"
            id="availabilityEnd"
            name="availabilityEnd"
            value={formData.availabilityEnd}
            onChange={handleChange}
          />

          <button type="submit" className="button">
            Search
          </button>
          <p>Or surprise your customers with a genre night!</p>
          <button
            type="button"
            onClick={handleGenreNightBooking}
            className="button"
          >
            Book Genre Night
          </button>
          <BookingModal
            isOpen={isBookingModalOpen}
            onRequestClose={() => setIsBookingModalOpen(false)}
            genreNightArtists={genreNightArtists}
            onSendMessages={handleSendMessages} // Implement this function as needed
          />
        </form>
      </div>

      {/* Placeholder for search results */}
      <div id="searchResults">
        {searchResults.map((user, index) => (
          <div key={index} className="user-result">
            <Link to={`/user/${user.id}`}>
              {" "}
              {/* Assuming you have routing set up to handle /profile/:userId */}
              <img
                src={user.profilePictureUrl}
                alt="Profile"
                style={{ maxWidth: "100px", maxHeight: "100px" }}
              />
              <div>
                <h3>{user.fullName}</h3>
                <p>Genre: {user.genre}</p>
                <p>Location: {user.location}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
      <footer>
        <p>Gigify &copy; 2023</p>
      </footer>
    </div>
  );
}

export default SearchPage;
