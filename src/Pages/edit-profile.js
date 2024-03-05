import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  deleteDoc,
  query,
  where,
  getDocs,
  writeBatch,
  getFirestore,
} from "firebase/firestore";
import { firestore, storage } from "../components/firebase/firebaseConfig";
import { useAuth } from "../components/firebase/AuthContext";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

async function geocodeAddress(address) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=YOUR_API_KEY_HERE`
  );
  const data = await response.json();

  if (data.results && data.results.length > 0) {
    const location = data.results[0].geometry.location;
    return location; // { lat: xx.xxx, lng: yy.yyy }
  } else {
    throw new Error("Geocoding failed or returned no results.");
  }
}

function EditProfilePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userCategory, setUserCategory] = useState("");

  // Correctly initialize state variables
  const [userDetails, setUserDetails] = useState({
    email: "",
    fullName: "",
    username: "",
    location: "",
    role: "",
    category: "",
    maxTravelDistance: "",
    performanceStyle: "",
    preferredVenues: "",
    preferredStyles: "",
    ambience: "",
    disabilities: "",
    // Initialize other fields as necessary
  });

  // Separate state for gallery files
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const fetchGalleryItems = async () => {
      if (!currentUser) return;

      const uid = currentUser.uid;
      const galleryRef = collection(firestore, "galleryItems");
      const q = query(galleryRef, where("uid", "==", uid));
      const querySnapshot = await getDocs(q);

      const items = querySnapshot.docs.map((doc) => ({
        id: doc.id, // Store document ID for deletion
        ...doc.data(),
      }));
      setGalleryItems(items);
    };

    const fetchUserData = async () => {
      setLoading(true);
      try {
        const uid = currentUser?.uid;
        const docRef = doc(firestore, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserDetails(docSnap.data());
          setUserCategory(docSnap.data().category);
        } else {
          setError("User not found.");
        }
      } catch (error) {
        setError("Error fetching user data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchGalleryItems();
      fetchUserData();
    }
  }, [currentUser]);

  const handleChange = (e) => {
    if (e.target.type === "file") {
      // Handle file input, but don't set state directly since it's async
      setUserDetails((prevDetails) => ({
        ...prevDetails,
        [e.target.name]: e.target.files[0], // Store File object
      }));
    } else if (e.target.name === "birthday") {
      // Handle birthday input and perform age validation
      const { value } = e.target;
      const selectedDate = new Date(value);
      const currentDate = new Date();
      const age = currentDate.getFullYear() - selectedDate.getFullYear();

      // Ensure the user is 18 years old or older
      if (age < 18) {
        // You can set an error state or prevent further form submission
        console.error("User must be 18 years old or older.");
        // Optionally set an error state or show a message to the user
        return;
      }

      setUserDetails((prevDetails) => ({
        ...prevDetails,
        [e.target.name]: value,
      }));
    } else {
      // Handle other inputs
      const { name, value } = e.target;
      setUserDetails((prevDetails) => ({
        ...prevDetails,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ensure `uid` is available in this scope
      const uid = currentUser?.uid;
      if (!uid) {
        throw new Error("User ID not available");
      }

      if (userDetails.location) {
        const geocodedLocation = await geocodeAddress(userDetails.location);
        // Add the geocoded location to the userDetails object
        userDetails.locationCoordinates = geocodedLocation;
      }

      const updatedUserDetails = { ...userDetails };
      delete updatedUserDetails.profilePicture; // Ensures the File object is not included in Firestore update.

      // Handle the profile picture upload if a file was selected.
      if (userDetails.profilePicture instanceof File) {
        const fileRef = ref(
          storage,
          `profilePictures/${uid}/${userDetails.profilePicture.name}`
        );
        const fileSnapshot = await uploadBytes(
          fileRef,
          userDetails.profilePicture
        );
        const profilePictureUrl = await getDownloadURL(fileSnapshot.ref);
        updatedUserDetails.profilePictureUrl = profilePictureUrl; // Include the URL in the update.
      }

      // Update Firestore document for user details.
      const userRef = doc(firestore, "users", uid);
      await updateDoc(userRef, updatedUserDetails);

      // Loop to handle gallery files uploads.
      for (const file of galleryFiles) {
        const galleryRef = ref(storage, `galleryItems/${uid}/${file.name}`);
        const snapshot = await uploadBytes(galleryRef, file);
        const url = await getDownloadURL(snapshot.ref);
        await addDoc(collection(firestore, "galleryItems"), {
          uid,
          url,
          type: file.type.startsWith("image") ? "photo" : "video",
        });
      }

      alert("Profile updated successfully!");
      navigate(`/availability`); // Redirect after successful update.
    } catch (error) {
      setError(`Error updating profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (e, itemId) => {
    if (e.target.checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    }
  };

  const deleteSelectedItems = async () => {
    const db = getFirestore(); // Get Firestore instance
    const batch = writeBatch(db); // Create a new batch

    for (const itemId of selectedItems) {
      const itemRef = doc(db, "galleryItems", itemId);
      batch.delete(itemRef);
    }

    try {
      await batch.commit();
      setGalleryItems(
        galleryItems.filter((item) => !selectedItems.includes(item.id))
      ); // Update UI
      setSelectedItems([]); // Clear selection
      alert("Selected items deleted successfully!");
    } catch (error) {
      console.error("Error deleting items:", error);
      alert("Failed to delete items. Please try again later.");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Edit Profile</h2>
      <form onSubmit={handleSubmit}>
        <p>Username:</p>
        <input
          name="username"
          value={userDetails.username}
          onChange={handleChange}
          type="text"
          placeholder="@Username"
          required // Consider requiring a username
        />

        <p>Category:</p>
        <select
          name="category"
          value={userDetails.category}
          onChange={handleChange}
        >
          <option value="">Select a Category</option>
          <option value="Musician">Musician</option>
          <option value="Venue">Venue</option>
        </select>

        <p>Email:</p>
        <input
          name="email"
          value={userDetails.email}
          onChange={handleChange}
          type="email"
          placeholder="Email"
          required
        />
        <p>Full Name:</p>
        <input
          name="fullName"
          value={userDetails.fullName}
          onChange={handleChange}
          type="text"
          placeholder="Full Name"
          required
        />
        <p>Birthday:</p>
        <input
          name="birthday"
          value={userDetails.birthday}
          onChange={handleChange}
          type="date"
          placeholder="Birthday"
          required
        />

        <p>Genre:</p>
        <input
          name="genre"
          value={userDetails.genre}
          onChange={handleChange}
          type="text"
          placeholder="Genre"
          required
        />

        <p>Location:</p>
        <input
          name="location"
          value={userDetails.location}
          onChange={handleChange}
          type="text"
          placeholder="Location"
          required
        />

        <p>Bio:</p>
        <input
          name="bio"
          value={userDetails.bio}
          onChange={handleChange}
          type="text"
          placeholder="Bio"
          required
        />

        <p>Max Travel Distance (miles):</p>
        <input
          name="maxTravelDistance"
          type="number"
          onChange={handleChange}
          value={userDetails.maxTravelDistance || ""}
          placeholder="Max Travel Distance"
          required
        />

        {userCategory === "Musician" && (
          <>
            <p>Role:</p>
            <input
              name="role"
              value={userDetails.role}
              onChange={handleChange}
              type="text"
              placeholder="Singer e.g."
              required
            />
            <p>Performance Style:</p>
            <input
              name="performanceStyle"
              onChange={handleChange}
              value={userDetails.performanceStyle || ""}
              placeholder="Performance Style"
              required={userCategory === "Musician"}
            />
            <p>Preferred Venues:</p>
            <input
              name="preferredVenues"
              onChange={handleChange}
              value={userDetails.preferredVenues || ""}
              placeholder="Preferred Venues"
              required={userCategory === "Musician"}
            />
          </>
        )}

        {userCategory === "Venue" && (
          <>
            <p>Preferred Styles:</p>
            <input
              name="preferredStyles"
              onChange={handleChange}
              value={userDetails.preferredStyles || ""}
              placeholder="Preferred Styles"
              required={userCategory === "Venue"}
            />
            <p>Ambience:</p>
            <input
              name="ambience"
              onChange={handleChange}
              value={userDetails.ambience || ""}
              placeholder="Ambience"
              required={userCategory === "Venue"}
            />
            <p>Capacity:</p>
            <input
              name="capacity"
              value={userDetails.capacity}
              onChange={handleChange}
              type="text"
              placeholder="100 e.g."
            />
          </>
        )}

        <p>Please outline any disabilities:</p>
        <input
          name="disabilities"
          onChange={handleChange}
          value={userDetails.disabilities || ""}
          placeholder="Disabilities"
        />

        <p>Instagram:</p>
        <input
          name="instagram"
          value={userDetails.instagram}
          onChange={handleChange}
          type="text"
          placeholder="instagram"
          required
        />

        <p>Spotify:</p>
        <input
          name="spotify"
          value={userDetails.spotify}
          onChange={handleChange}
          type="text"
          placeholder="Spotify"
        />

        <p>TikTok:</p>
        <input
          name="tiktok"
          value={userDetails.tiktok}
          onChange={handleChange}
          type="text"
          placeholder="TikTok"
        />

        <p>YouTube:</p>
        <input
          name="youtube"
          value={userDetails.youtube}
          onChange={handleChange}
          type="text"
          placeholder="Youtube"
        />

        <p>Profile Picture:</p>
        <input type="file" name="profilePicture" onChange={handleChange} />

        <p>Add Photos/Videos:</p>
        <input
          type="file"
          multiple
          onChange={(e) => setGalleryFiles([...e.target.files])}
        />

        <p>Delete Photos</p>
        {galleryItems.map((item) => (
          <div key={item.id}>
            {item.type === "photo" ? (
              <img
                src={item.url}
                alt="Gallery Item"
                style={{ maxWidth: "100px", maxHeight: "100px" }}
              />
            ) : (
              <video width="320" height="240" controls>
                <source src={item.url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}
            <input
              type="checkbox"
              onChange={(e) => handleSelectItem(e, item.id)}
              checked={selectedItems.includes(item.id)}
            />
          </div>
        ))}

        <button type="button" onClick={deleteSelectedItems}>
          Delete Selected Photos
        </button>

        <button type="submit">Update Profile</button>
      </form>
    </div>
  );
}

export default EditProfilePage;
