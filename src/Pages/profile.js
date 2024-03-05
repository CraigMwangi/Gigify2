import React, { useState } from "react";
import { firestore, auth } from "../components/firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

function ProfilePage() {
  const [userProfile, setUserProfile] = useState({
    bio: "",
    role: "",
    birthday: "",
    category: "",
    email: "",
    fullName: "",
    gallery: "",
    genre: "",
    instagram: "",
    location: "",
    profilePicture: "",
    spotify: "",
    tiktok: "",
    uid: "", // Ensure this is set based on the authenticated user's UID
    youtube: "",
  });

  const currentUser = auth.currentUser;

  if (currentUser) {
    // The user is authenticated
    const userUid = currentUser.uid;
    // Now you can use `userUid` as needed
  } else {
    // Handle the case where the user is not authenticated
    // You may want to redirect to the login page or show a message
  }

  const [imageUpload, setImageUpload] = useState(null); // New state for storing the uploaded image
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "profilePicture") {
      setImageUpload(e.target.files[0]); // Handle image file
    } else {
      setUserProfile({ ...userProfile, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;

    if (currentUser) {
      const userUid = currentUser.uid;
      const photoURL = await handleUpload();

      // Use setDoc with userUid as the document ID
      await setDoc(doc(firestore, "users", userUid), {
        ...userProfile,
        profilePicture: photoURL,
        uid: userUid,
      });

      navigate(`/availability`);
    } else {
      console.log("User is not authenticated");
      navigate("/login");
    }
  };

  const handleUpload = async () => {
    if (!imageUpload) {
      console.error("No file selected for upload.");
      return;
    }

    const storage = getStorage();
    const fileRef = storageRef(
      storage,
      `profilePictures/${Date.now()}_${imageUpload.name}`
    );

    try {
      const snapshot = await uploadBytes(fileRef, imageUpload);
      const photoURL = await getDownloadURL(snapshot.ref);
      console.log("File uploaded successfully:", photoURL); // Log the URL
      return photoURL;
    } catch (error) {
      console.error("Error uploading file: ", error);
      throw new Error("Failed to upload profile picture.");
    }
  };

  return (
    <div className="main-content">
      <form onSubmit={handleSubmit}>
        <label>Category:</label>
        <select
          name="category"
          value={userProfile.category}
          onChange={handleChange}
        >
          <option value="">Select a Category</option>
          <option value="Musician">Musician</option>
          <option value="Venue">Venue</option>
        </select>

        <label>Role:</label>
        <input
          name="role"
          value={userProfile.role}
          onChange={handleChange}
          type="text"
          placeholder="Role"
          required
        />

        <label>Email:</label>
        <input
          type="email"
          name="email"
          value={userProfile.email}
          onChange={handleChange}
        />

        <label>Full Name:</label>
        <input
          type="text"
          name="fullName"
          value={userProfile.fullName}
          onChange={handleChange}
        />

        <label>Birthday:</label>
        <input
          type="date"
          name="birthday"
          value={userProfile.birthday}
          onChange={handleChange}
        />

        <label>Genre:</label>
        <input
          type="text"
          name="genre"
          value={userProfile.genre}
          onChange={handleChange}
        />

        <label>Location:</label>
        <input
          type="text"
          name="location"
          value={userProfile.location}
          onChange={handleChange}
        />

        <label>Bio:</label>
        <input
          type="text"
          name="bio"
          value={userProfile.bio}
          onChange={handleChange}
        />
        <label>Maximum Distance:</label>
        <input
          type="text"
          name="distance"
          value={userProfile.distance}
          onChange={handleChange}
        />

        <label>Instagram:</label>
        <input
          type="text"
          name="instagram"
          value={userProfile.instagram}
          onChange={handleChange}
        />

        <label>Spotify:</label>
        <input
          type="text"
          name="spotify"
          value={userProfile.spotify}
          onChange={handleChange}
        />

        <label>TikTok:</label>
        <input
          type="text"
          name="tiktok"
          value={userProfile.tiktok}
          onChange={handleChange}
        />

        <label>Youtube:</label>
        <input
          type="text"
          name="youtube"
          value={userProfile.youtube}
          onChange={handleChange}
        />

        <label>Profile Picture:</label>
        <input type="file" name="profilePicture" onChange={handleChange} />

        <button type="submit" className="button">
          Register
        </button>
      </form>
    </div>
  );
}

export default ProfilePage;
