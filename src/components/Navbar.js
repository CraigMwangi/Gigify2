import React from "react";
import { Link } from "react-router-dom";
import { logout } from "./firebase/firebaseConfig";
import { useAuth } from "./firebase/AuthContext"; // Adjust the import path as necessary

function Navbar() {
  const { currentUser } = useAuth(); // Access the current user from the context

  const handleLogout = async () => {
    try {
      await logout(); // Call the logout function when the button is clicked
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <nav>
      <h1>Gigify</h1>
      <ul>
        <li>
          <Link to="/home">Home</Link>
        </li>
        {currentUser && (
          <li>
            <Link to="/search">Search</Link>
          </li>
        )}
        {currentUser && (
          <li>
            <Link to="/events">Events</Link>
          </li>
        )}
        {!currentUser && (
          <li>
            <Link to="/login">Register/Login</Link>
          </li>
        )}
        {currentUser && (
          <>
            <li>
              <Link to="/feed">Feed</Link>
            </li>
            <li>
              <Link to={`/user-profile/${currentUser.uid}`}>My Account</Link>
            </li>
          </>
        )}
        {currentUser && (
          <li>
            <Link to="/myevents">My Events</Link>
          </li>
        )}
        <li>
          <Link to="/resources">Resources</Link>
        </li>
        <li>
          <Link to="/contact">Contact</Link>
        </li>
        <li>
          <button onClick={handleLogout}>Logout</button>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
