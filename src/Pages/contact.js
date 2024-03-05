import React, { useState } from "react";
import { useAuth } from "../components/firebase/AuthContext.js";

function ContactPage() {
  const { currentUser } = useAuth();
  // Define state for each form field
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    email: "",
  });

  // Update state on input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Here, you can perform the fetch operation to send form data
    fetch("/send-contact-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((response) => response.json())
      .then((data) => {
        alert("Message sent successfully.");
        // Optionally reset form fields here
        setFormData({ subject: "", description: "", email: "" });
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Error sending message.");
      });
  };

  // Render form
  return (
    // <h2>Find Your Sound!</h2>
    // <p>Gigify is a platform that connects local musicians and venues.</p>
    // <p>
    //   Musicians and Venues can create a profile and list their availability,
    //   genre, and location. Allowing you to search for local musicians &
    //   venues based on these criteria for gigs.
    // </p>
    // <p>
    //   The goal of the platform is to empower local musicians and venues by
    //   providing an intuitive platform that puts the power of booking in the
    //   musicians hands and for venues, making the process of finding acts or
    //   venues much easier with all the details and acts in one place.
    // </p>
    // <p>
    //   If you're a musician or venue, sign up and try Gigify for your next
    //   live music event!
    // </p>
    <form id="contactForm" onSubmit={handleSubmit}>
      <div>
        {currentUser ? (
          <p>Welcome, {currentUser.fullName}</p> // Display user info
        ) : (
          <p>Please log in.</p>
        )}
        <label htmlFor="subject">Subject:</label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />
      </div>
      <button type="submit">Send Message</button>
    </form>
  );
}

export default ContactPage;
