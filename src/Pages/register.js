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

// Register Page for New User Sign Up
// No comments for this page as it functions the same as Edit Profile

async function geocodeAddress(address) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=process.env.REACT_APP_GOOGLE_MAPS_API_KEY`
  );
  const data = await response.json();

  if (data.results && data.results.length > 0) {
    const location = data.results[0].geometry.location;
    return location;
  } else {
    throw new Error("Geocoding failed or returned no results.");
  }
}

function RegisterPage() {
  const navigate = useNavigate();
  const [birthdayError, setBirthdayError] = useState("");
  const [emailError, setEmailError] = useState("");
  const { currentUser } = useAuth();
  const [userCategory, setUserCategory] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [spotifyLink, setSpotifyLink] = useState("");
  const convertToEmbedUrl = (youtubeLink) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = youtubeLink.match(regExp);

    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
  };
  const convertSpotifyToEmbedUrl = (spotifyLink) => {
    const regExp =
      /^(?:https?:\/\/)?open\.spotify\.com\/(track|playlist|album)\/([^?]*)(?:\?.*)?$/;
    const match = spotifyLink.match(regExp);

    if (match && match[1] && match[2]) {
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
    }
    return null;
  };

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
    youtubeLink: "",
    spotifyLink: "",
  });

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
          if (userDetails.youtubeEmbedUrl) {
            const youtubeVideoId = userDetails.youtubeEmbedUrl.split("/").pop();
            const youtubeLink = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
            setYoutubeLink(youtubeLink);
          }
          if (userDetails.spotifyEmbedUrl) {
            const spotifyParts = userDetails.spotifyEmbedUrl.match(
              /spotify\.com\/embed\/(track|playlist|album)\/([^?]+)/
            );
            if (spotifyParts) {
              const spotifyType = spotifyParts[1];
              const spotifyId = spotifyParts[2];
              const spotifyLink = `https://open.spotify.com/${spotifyType}/${spotifyId}`;
              setSpotifyLink(spotifyLink);
            }
          }
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
    const { name, value } = e.target;
    if (name === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setEmailError("Please enter a valid email address.");
      } else {
        setEmailError("");
      }
    }
    if (e.target.name === "birthday") {
      const birthday = new Date(e.target.value);
      const today = new Date();
      const age = today.getFullYear() - birthday.getFullYear();
      const m = today.getMonth() - birthday.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
        age--;
      }
      if (age < 16) {
        setBirthdayError("You must be at least 16 years old to register.");
        return;
      } else {
        setBirthdayError("");
      }
    }
    if (e.target.type === "file") {
      setUserDetails((prevDetails) => ({
        ...prevDetails,
        [e.target.name]: e.target.files[0],
      }));
    } else if (e.target.name === "birthday") {
      const { value } = e.target;
      const selectedDate = new Date(value);
      const currentDate = new Date();
      const age = currentDate.getFullYear() - selectedDate.getFullYear();

      if (age < 16) {
        console.error("User must be 16 years old or older.");
        return;
      }

      setUserDetails((prevDetails) => ({
        ...prevDetails,
        [e.target.name]: value,
      }));
    } else {
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
    setError("");
    if (emailError) {
      alert("Please correct the errors before submitting.");
      return;
    }
    if (birthdayError) {
      alert("Please correct the errors before submitting.");
      return;
    }

    const youtubeEmbedUrl = convertToEmbedUrl(youtubeLink);
    const spotifyEmbedUrl = convertSpotifyToEmbedUrl(spotifyLink);

    try {
      const uid = currentUser?.uid;
      if (!uid) {
        throw new Error("User ID not available");
      }

      const updatedUserDetails = {
        ...userDetails,
        youtubeEmbedUrl,
        spotifyEmbedUrl,
      };
      delete updatedUserDetails.profilePicture;

      let profilePictureUrl = userDetails.profilePictureUrl;
      if (userDetails.profilePicture instanceof File) {
        const fileRef = ref(
          storage,
          `profilePictures/${uid}/${userDetails.profilePicture.name}`
        );
        const fileSnapshot = await uploadBytes(
          fileRef,
          userDetails.profilePicture
        );
        profilePictureUrl = await getDownloadURL(fileSnapshot.ref);
        updatedUserDetails.profilePictureUrl = profilePictureUrl;
      }

      const userRef = doc(firestore, "users", uid);
      await updateDoc(userRef, updatedUserDetails);
      setLoading(false);

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
      navigate(`/user-profile/${uid}`);
    } catch (error) {
      console.error(`Error updating profile: ${error}`);
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
    const db = getFirestore();
    const batch = writeBatch(db);

    for (const itemId of selectedItems) {
      const itemRef = doc(db, "galleryItems", itemId);
      batch.delete(itemRef);
    }

    try {
      await batch.commit();
      setGalleryItems(
        galleryItems.filter((item) => !selectedItems.includes(item.id))
      );
      setSelectedItems([]);
      alert("Selected items deleted successfully!");
    } catch (error) {
      console.error("Error deleting items:", error);
      alert("Failed to delete items. Please try again later.");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container">
      <div className="edit-profile-container">
        <h2>Create Your Profile</h2>
        <form onSubmit={handleSubmit}>
          <p>Username:</p>
          <div className="input-with-info">
            <input
              name="username"
              value={userDetails.username}
              onChange={handleChange}
              type="text"
              placeholder="@Username"
              required
            />
            <span
              className="info-icon"
              data-tooltip="Enter your unique username."
            >
              @
            </span>
          </div>

          <p>Category:</p>
          <div className="input-with-info">
            <select
              name="category"
              value={userDetails.category}
              onChange={handleChange}
            >
              <option value="">Select a Category</option>
              <option value="Musician">Musician</option>
              <option value="Venue">Venue</option>
            </select>
            <span
              className="info-icon"
              data-tooltip="Choose a category that best describes you."
            >
              i
            </span>
          </div>

          <p>Contact Email:</p>
          <div className="input-with-info">
            <input
              name="email"
              value={userDetails.email}
              onChange={handleChange}
              type="email"
              placeholder="Email"
              required
            />
            <span
              className="info-icon"
              data-tooltip="Enter your email address used for communication."
            >
              i
            </span>
          </div>
          {emailError && <p className="error">{emailError}</p>}

          <p>Full Name:</p>
          <div className="input-with-info">
            <input
              name="fullName"
              value={userDetails.fullName}
              onChange={handleChange}
              type="text"
              placeholder="Full Name"
              required
            />
            <span
              className="info-icon"
              data-tooltip="Enter your legal full name."
            >
              i
            </span>
          </div>

          <p>Birthday:</p>
          <div className="input-with-info">
            <input
              name="birthday"
              value={userDetails.birthday}
              onChange={handleChange}
              type="date"
              required
            />
            <span
              className="info-icon"
              data-tooltip="Enter your birth date. Must be 18 or older."
            >
              i
            </span>
          </div>
          {birthdayError && <p className="error">{birthdayError}</p>}

          <p>Genre:</p>
          <div className="input-with-info">
            <input
              name="genre"
              value={userDetails.genre}
              onChange={handleChange}
              type="text"
              placeholder="Genre"
              required
            />
            <span
              className="info-icon"
              data-tooltip="Specify your music genre or the event's ambience."
            >
              i
            </span>
          </div>

          <p>Location:</p>
          <div className="input-with-info">
            <input
              name="location"
              value={userDetails.location}
              onChange={handleChange}
              type="text"
              placeholder="Location"
              required
            />
            <span
              className="info-icon"
              data-tooltip="Enter your primary operating or living location."
            >
              i
            </span>
          </div>

          <p>Bio:</p>
          <div className="input-with-info">
            <input
              name="bio"
              value={userDetails.bio}
              onChange={handleChange}
              type="text"
              placeholder="Bio"
              required
            />
            <span
              className="info-icon"
              data-tooltip="Write a short biography to appear on your profile."
            >
              i
            </span>
          </div>

          <p>Max Travel Distance (miles):</p>
          <div className="input-with-info">
            <input
              name="maxTravelDistance"
              type="number"
              onChange={handleChange}
              value={userDetails.maxTravelDistance || ""}
              placeholder="Max Travel Distance"
              required
            />
            <span
              className="info-icon"
              data-tooltip="Enter the maximum distance you are willing to travel."
            >
              i
            </span>
          </div>
          {/* Conditional inputs for musicians */}
          {userCategory === "Musician" && (
            <>
              <p>Role:</p>
              <div className="input-with-info">
                <input
                  name="role"
                  value={userDetails.role}
                  onChange={handleChange}
                  type="text"
                  placeholder="Singer, Guitarist, etc."
                  required
                />
                <span
                  className="info-icon"
                  data-tooltip="Describe your role in performances."
                >
                  i
                </span>
              </div>

              <p>Performance Style:</p>
              <div className="input-with-info">
                <input
                  name="performanceStyle"
                  value={userDetails.performanceStyle || ""}
                  onChange={handleChange}
                  placeholder="Solo, Band, DJ, etc."
                  required={userCategory === "Musician"}
                />
                <span
                  className="info-icon"
                  data-tooltip="Describe the style or nature of your performances."
                >
                  i
                </span>
              </div>

              <p>Preferred Venues:</p>
              <div className="input-with-info">
                <input
                  name="preferredVenues"
                  value={userDetails.preferredVenues || ""}
                  onChange={handleChange}
                  placeholder="Cafes, Theaters, etc."
                  required={userCategory === "Musician"}
                />
                <span
                  className="info-icon"
                  data-tooltip="List types of venues you prefer for your performances."
                >
                  i
                </span>
              </div>
            </>
          )}

          {/* Conditional inputs for venues */}
          {userCategory === "Venue" && (
            <>
              <p>Preferred Styles:</p>
              <div className="input-with-info">
                <input
                  name="preferredStyles"
                  value={userDetails.preferredStyles || ""}
                  onChange={handleChange}
                  placeholder="Jazz, Rock, Electronic, etc."
                  required={userCategory === "Venue"}
                />
                <span
                  className="info-icon"
                  data-tooltip="Specify the musical styles preferred for events at your venue."
                >
                  i
                </span>
              </div>

              <p>Ambience:</p>
              <div className="input-with-info">
                <input
                  name="ambience"
                  value={userDetails.ambience || ""}
                  onChange={handleChange}
                  placeholder="Casual, Intimate, etc."
                  required={userCategory === "Venue"}
                />
                <span
                  className="info-icon"
                  data-tooltip="Describe the general atmosphere of your venue."
                >
                  i
                </span>
              </div>

              <p>Capacity:</p>
              <div className="input-with-info">
                <input
                  name="capacity"
                  value={userDetails.capacity}
                  onChange={handleChange}
                  type="number"
                  placeholder="Maximum number of attendees."
                />
                <span
                  className="info-icon"
                  data-tooltip="Enter the maximum capacity of your venue."
                >
                  i
                </span>
              </div>
            </>
          )}
          <p>Disabilities:</p>
          <div className="input-with-info">
            <input
              name="disabilities"
              onChange={handleChange}
              value={userDetails.disabilities || ""}
              placeholder="Disabilities"
            />
            <span
              className="info-icon"
              data-tooltip="Please outline any disabilities."
            >
              i
            </span>
          </div>
          <p>YouTube Embed:</p>
          <div className="input-with-info">
            <input
              type="text"
              name="youtubeLink"
              value={userDetails.youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              placeholder="Enter YouTube URL link"
            />
            <span
              className="info-icon"
              data-tooltip="Provide a link to a YouTube video to embed on your profile."
            >
              i
            </span>
          </div>
          <p>Spotify Embed:</p>
          <div className="input-with-info">
            <input
              type="text"
              name="spotifyLink"
              value={userDetails.spotifyLink}
              onChange={(e) => setSpotifyLink(e.target.value)}
              placeholder="Enter Spotify URL link"
            />
            <span
              className="info-icon"
              data-tooltip="Provide a link to a Spotify track or playlist to embed on your profile."
            >
              i
            </span>
          </div>
          <p>Instagram:</p>
          <div className="input-with-info">
            <input
              name="instagram"
              value={userDetails.instagram}
              onChange={handleChange}
              type="text"
              placeholder="Link your Instagram"
              required
            />
            <span
              className="info-icon"
              data-tooltip="Link your Instagram profile for others to follow."
            >
              i
            </span>
          </div>
          <p>Spotify:</p>
          <div className="input-with-info">
            <input
              name="spotify"
              value={userDetails.spotify}
              onChange={handleChange}
              type="text"
              placeholder="Link your Spotify"
            />
            <span
              className="info-icon"
              data-tooltip="Provide a direct link to your Spotify profile."
            >
              i
            </span>
          </div>
          <p>TikTok:</p>
          <div className="input-with-info">
            <input
              name="tiktok"
              value={userDetails.tiktok}
              onChange={handleChange}
              type="text"
              placeholder="Link your TikTok"
            />
            <span
              className="info-icon"
              data-tooltip="Provide a link to your TikTok profile."
            >
              i
            </span>
          </div>
          <p>YouTube:</p>
          <div className="input-with-info">
            <input
              name="youtube"
              value={userDetails.youtube}
              onChange={handleChange}
              type="text"
              placeholder="Link your YouTube"
            />
            <span
              className="info-icon"
              data-tooltip="Link your YouTube channel."
            >
              i
            </span>
          </div>
          <p>Profile Picture:</p>
          <div className="input-with-info">
            <input type="file" name="profilePicture" onChange={handleChange} />
            <span
              className="info-icon"
              data-tooltip="Upload a profile picture to enhance your profile's visibility."
            >
              i
            </span>
          </div>
          <p>Add Photos/Videos to Gallery:</p>
          <div className="input-with-info">
            <input
              type="file"
              multiple
              onChange={(e) => setGalleryFiles([...e.target.files])}
            />
            <span
              className="info-icon"
              data-tooltip="Add photos or videos to your gallery."
            >
              i
            </span>
          </div>

          <div className="input-with-info">
            {galleryItems.map((item) => (
              <div key={item.id} className="gallery-items-container">
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
                <span
                  className="info-icon"
                  data-tooltip="Select items to delete from your gallery."
                >
                  i
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={deleteSelectedItems}
            className="button"
          >
            Delete Selected Photos
          </button>

          <button onClick={handleSubmit} className="button">
            Update Profile
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
