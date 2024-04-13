import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/firebase/AuthContext.js";
import PrivateRoute from "./components/PrivateRoute.js";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./components/Navbar.js";
import LoginPage from "./components/LoginPage.js";
import HomePage from "./Pages/home.js";
import ContactPage from "./Pages/contact.js";
import SearchPage from "./Pages/search.js";
import UserProfilePage from "./Pages/user-profile.js";
import EditProfilePage from "./Pages/edit-profile.js";
import UserPage from "./Pages/user.js";
import FeedPage from "./Pages/feedPage.js";
import EventsPage from "./Pages/eventspage.js";
import ResourcesPage from "./Pages/resources.js";
import MyEventsPage from "./Pages/myevents.js";
import RegisterPage from "./Pages/register.js";
import Footer from "./Pages/footer.js";
import "./components/styles/global.css";

function App() {
  return (
    <AuthProvider>
      {" "}
      {/* Routes within AuthProvider to prevent unauthorised users*/}
      <Router>
        <div>
          <Navbar />
          <Routes>
            <Route path="/" element={<UserProfilePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/myevents" element={<MyEventsPage />} />
            <Route path="/user-profile/:uid" element={<UserProfilePage />} />
            <Route path="/edit-profile/:uid" element={<EditProfilePage />} />
            <Route path="/user/:uid" element={<UserPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            {/* Other routes */}
          </Routes>
        </div>
        <Footer />
      </Router>
    </AuthProvider>
  );
}

export default App;
