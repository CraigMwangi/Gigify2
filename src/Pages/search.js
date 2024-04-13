import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";

// Function to get coordinates for a given location
async function getCoordinatesForLocation(location) {
  const apiKey = "AIzaSyAJP4EUYo_UsOFFPFHiIjcwU_OI77GQhIQ"; // Hard Coded API Key will be hidden in future
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
  const [formData, setFormData] = useState({
    acts: "",
    location: "",
    genre: "",
    availabilityStart: "",
    availabilityEnd: "",
    maxTravelDistance: "",
    username: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let userCoordinates;
    try {
      userCoordinates = await getCoordinatesForLocation(formData.location);
    } catch (error) {
      console.error("Error fetching location coordinates:", error);
      alert("Location not found. Please enter a valid location."); // Error if location is invalid
      return;
    }

    let q = query(collection(firestore, "users"));
    if (formData.genre) {
      q = query(q, where("genre", "==", formData.genre));
    }
    if (formData.acts) {
      q = query(q, where("acts", "==", parseInt(formData.acts)));
    }

    if (formData.username) {
      // Check if username is provided and update the query
      q = query(q, where("username", "==", formData.username.trim()));
    }

    try {
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      const filteredUsers = users.filter((user) => {
        return true; // Placeholder return
      });

      setSearchResults(filteredUsers); // Update state with filtered users
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  return (
    <div className="container">
      <div className="search-form">
        <h2 className="header-text">Search Musicians or Venues</h2>
        <p className="centre-text">Use the Search to find other users.</p>
        <form
          id="searchForm"
          onSubmit={handleSubmit}
          className="events-filter-content"
          style={{ borderRadius: "8px" }}
        >
          <label htmlFor="username">Search Username:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
          />
          <label htmlFor="location">Search Location:</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
          />

          <label htmlFor="maxTravelDistance">
            Search Max Travel Distance (miles):
          </label>
          <input
            type="number"
            id="maxTravelDistance"
            name="maxTravelDistance"
            min="1"
            value={formData.maxTravelDistance}
            onChange={handleChange}
          />

          <label htmlFor="genre">Search Genre:</label>
          <input
            type="text"
            id="genre"
            name="genre"
            value={formData.genre}
            onChange={handleChange}
          />

          <label htmlFor="availabilityStart">Search Availability Start:</label>
          <input
            type="date"
            id="availabilityStart"
            name="availabilityStart"
            value={formData.availabilityStart}
            onChange={handleChange}
          />

          <label htmlFor="availabilityEnd">Search Availability End:</label>
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
        </form>
      </div>
      <div id="search-results-content">
        {searchResults.map((user, index) => (
          <div key={index} className="user-result">
            <Link to={`/user/${user.id}`}>
              {" "}
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
    </div>
  );
}

export default SearchPage;
