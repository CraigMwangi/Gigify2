import React, { useState } from "react";
import { useAuth } from "../components/firebase/AuthContext";
import emailjs from "emailjs-com";

function ContactPage() {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    email: currentUser?.email || "", // Default to current user's email if available
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check if the email field is filled
    if (!formData.email) {
      alert("Please enter your email address.");
      return;
    }

    // Prepare parameters for EmailJS
    const emailParams = {
      to_email: formData.email, // Assuming 'to_email' is the parameter expected by your EmailJS template
      subject: formData.subject,
      description: formData.description,
    };

    emailjs
      .send(
        "service_hmbss4p",
        "template_6huj8xr",
        emailParams,
        "qPX4lZbgV_2l9XtX7"
      )
      .then(
        (response) => {
          console.log(
            "Message sent successfully",
            response.status,
            response.text
          );
          alert("Message sent successfully.");
          setFormData({ subject: "", description: "", email: "" });
        },
        (error) => {
          console.log("Failed to send message", error);
          alert("Failed to send message.");
        }
      );
  };

  return (
    <div className="container">
      <form id="contact-form" onSubmit={handleSubmit}>
        <h1 className="centre-text">Contact Us</h1>
        <p className="centre-text">
          Hi! I hope you're enjoying Gigify, if you have any issues please don't
          hesitate to contact us.
        </p>
        <div className="form-group">
          <label htmlFor="subject">Subject:</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="input-text"
          />
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="textarea"
          />
          <label htmlFor="email">Your Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="input-text"
          />
        </div>
        <button type="submit" className="button">
          Send Message
        </button>
      </form>
    </div>
  );
}

export default ContactPage;
