import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/firebase/AuthContext.js"; // Adjust the path as necessary
import PrivateRoute from "./components/PrivateRoute.js"; // Adjust the path as necessary

import Navbar from "./components/Navbar.js";
import LoginPage from "./components/LoginPage.js";
import HomePage from "./Pages/home.js";
import ContactPage from "./Pages/contact.js";
import SearchPage from "./Pages/search.js";
import ProfilePage from "./Pages/profile.js";
import UserProfilePage from "./Pages/user-profile.js";
import EditProfilePage from "./Pages/edit-profile.js";
import UserAvailabilityPage from "./Pages/availability.js";
import User from "./Pages/user.js";
import FeedPage from "./Pages/feedPage.js";
import EventDetailsPage from "./Pages/eventdetails.js";
import EventsPage from "./Pages/eventspage.js";
import ResourcesPage from "./Pages/resources.js";
import MyEventsPage from "./Pages/myevents.js";

function App() {
  return (
    <AuthProvider>
      {" "}
      {/* Wrap your Routes within AuthProvider */}
      <Router>
        <div>
          <Navbar />
          <Routes>
            <Route path="/home" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/myevents" element={<MyEventsPage />} />
            <Route path="/user-profile/:uid" element={<UserProfilePage />} />
            <Route path="/edit-profile/:uid" element={<EditProfilePage />} />
            <Route path="/event/:eventId" element={<EventDetailsPage />} />
            <Route path="/user/:uid" element={<User />} />
            <Route path="/availability" element={<UserAvailabilityPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            {/* Replace the Route for ProfilePage with PrivateRoute */}
            <Route path="/profile" element={<ProfilePage />} />
            {/* Other routes */}
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
