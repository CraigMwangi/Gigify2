import React from "react";
import { Link } from "react-router-dom";
import { logout } from "./firebase/firebaseConfig";
import { useAuth } from "./firebase/AuthContext";
import Logo from "../Pages/images/gigifylogo1.png";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const { currentUser } = useAuth(); // Access the current user from the context
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await logout(); // Logout when user clicks button
      navigate("/home"); // Redirects user to home page after they log out
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="navbar">
      <Link to="/home">
        <img src={Logo} alt="Gigify Logo" className="navbar-logo" />
      </Link>
      <button
        className="menu-button"
        onClick={() => document.body.classList.toggle("menu-open")}
      >
        ☰
      </button>
      <nav>
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
              <li>
                <Link to={`/edit-profile/${currentUser.uid}`}>
                  Edit Account
                </Link>
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
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default Navbar;
