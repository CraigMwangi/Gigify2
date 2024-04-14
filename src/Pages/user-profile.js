import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";
import { useAuth } from "../components/firebase/AuthContext.js";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { gapi } from "gapi-script";
import "react-big-calendar/lib/css/react-big-calendar.css";
import CalendarModal from "./calendarModal.js";
import Notifications from "./notifications.js";

const localizer = momentLocalizer(moment);

function UserProfilePage() {
  const { currentUser } = useAuth(); // Ensures current user is authenticated
  const navigate = useNavigate();
  const { uid } = useParams(); // Get UID from URL
  const [events, setEvents] = useState([]);
  const [profileData, setProfileData] = useState(null); // Fetches users details
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state
  const [selectedEvent, setSelectedEvent] = useState(null); // Selected event state for calendar
  const [isModalOpen, setIsModalOpen] = useState(false); // Opens Modal
  const [followingUsers, setFollowingUsers] = useState([]); // State for Following users
  const [followersUsers, setFollowersUsers] = useState([]); // State for Follower users
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [userCategory, setUserCategory] = useState(""); // State for users category
  const [showFollowersModal, setShowFollowersModal] = useState(false); // Shows the Followers
  const [showFollowingModal, setShowFollowingModal] = useState(false); // Shows the Following

  const galleryRef = useRef(null); // Reference for Gallery Photo
  const [isImageModalOpen, setImageModalOpen] = useState(false); // Modal to open images full size
  const [currentMedia, setCurrentMedia] = useState(null);

  // Modal to open image in full
  const openImageModal = (media) => {
    setCurrentMedia(media);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
  };

  // Load for Google Calendar API
  // Fetches user profile data from Firestore

  useEffect(() => {
    const fetchData = async () => {
      if (!uid) {
        setLoading(false);
        setError("User ID not provided.");
        return;
      }

      setLoading(true);

      try {
        const docRef = doc(firestore, "users", uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError("User not found.");
          setLoading(false);
          return;
        }

        const userData = docSnap.data();

        const galleryRef = collection(firestore, "galleryItems");
        const q = query(galleryRef, where("uid", "==", uid));
        const querySnapshot = await getDocs(q);
        const galleryItems = querySnapshot.docs.map((doc) => doc.data());

        const availabilityRef = doc(firestore, "userAvailability", uid);
        const availabilitySnap = await getDoc(availabilityRef);
        const availabilityData = availabilitySnap.exists()
          ? availabilitySnap.data()
          : {};

        setUserCategory(docSnap.data().category);
        setProfileData({
          ...userData,
          gallery: galleryItems,
          availability: availabilityData,
        });
      } catch (error) {
        setError("Error fetching data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [uid]);

  // Fetch the users followers/following
  useEffect(() => {
    if (uid && currentUser) {
      checkIsFollowing();
      fetchFollowers();
      fetchFollowing();
    }
  }, [uid, currentUser]);

  // Checking if the current user is following the viewed user

  const checkIsFollowing = () => {
    const q = query(
      collection(firestore, "Follows"),
      where("followerId", "==", currentUser.uid),
      where("followingId", "==", uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsFollowing(!snapshot.empty);
    });
    return () => unsubscribe();
  };

  const fetchFollowers = async () => {
    const followersQuery = query(
      collection(firestore, "Follows"),
      where("followingId", "==", uid)
    );
    const querySnapshot = await getDocs(followersQuery);
    const followerIds = querySnapshot.docs.map((doc) => doc.data().followerId);

    const userPromises = followerIds.map(async (id) => {
      const userDoc = await getDoc(doc(firestore, "users", id));
      return { id: userDoc.id, ...userDoc.data() };
    });

    const usersDetails = await Promise.all(userPromises);
    setFollowersUsers(usersDetails);
  };

  const fetchFollowing = async () => {
    const followingQuery = query(
      collection(firestore, "Follows"),
      where("followerId", "==", uid)
    );
    const querySnapshot = await getDocs(followingQuery);
    const followingIds = querySnapshot.docs.map(
      (doc) => doc.data().followingId
    );

    const userPromises = followingIds.map(async (id) => {
      const userDoc = await getDoc(doc(firestore, "users", id));
      return { id: userDoc.id, ...userDoc.data() };
    });

    const usersDetails = await Promise.all(userPromises);
    setFollowingUsers(usersDetails);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleOpenGoogleCalendar = () => {
    window.open("https://calendar.google.com/");
  };

  // Modal to display followers/following on profile

  const ListModal = ({ isOpen, onClose, title, list }) => {
    if (!isOpen) return null;

    const listSummary = list.length
      ? `${list.length} ${list.length === 1 ? "person" : "people"}`
      : `No ${title.toLowerCase()}`;

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-header">{title}</h2>
          <p className="modal-summary">{listSummary}</p>
          {list.length > 0 ? (
            <ul className="modal-list">
              {list.map((user) => (
                <li
                  key={user.id}
                  className="click-follow"
                  onClick={() => {
                    navigate(`/user/${user.id}`);
                    onClose(); // Close modal when a user is selected
                  }}
                >
                  {user.name || user.username || "Unnamed User"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="modal-empty-message">
              {title === "Followers"
                ? "User has no followers."
                : "User is not following anyone."}
            </p>
          )}
          <button className="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="notifications">
        <Notifications currentUser={currentUser} />
      </div>
      <div className="profile-details">
        <h2>{profileData?.username}</h2>
        <h4>{profileData?.category}</h4>
        <p>{profileData?.Role}</p>
      </div>
      <div className="follow-info">
        <div
          style={{
            cursor: "pointer",
            textDecoration: "underline",
          }}
          onClick={() => setShowFollowersModal(true)}
        >
          Followers: {followersUsers.length}
        </div>
        <div
          style={{
            cursor: "pointer",
            textDecoration: "underline",
          }}
          onClick={() => setShowFollowingModal(true)}
        >
          Following: {followingUsers.length}
        </div>
      </div>
      <div>
        <ListModal
          isOpen={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
          title="Followers"
          list={followersUsers}
        />
        <ListModal
          isOpen={showFollowingModal}
          onClose={() => setShowFollowingModal(false)}
          title="Following"
          list={followingUsers}
        />
      </div>
      <div className="profile-picture-container">
        {profileData?.profilePictureUrl && (
          <img
            src={profileData.profilePictureUrl}
            alt="Profile"
            className="profile-picture"
          />
        )}
      </div>
      <div className="account-details">
        <h3 className="top-content">{profileData?.username} Top Video</h3>
        <div className="embed-container">
          {profileData.youtubeEmbedUrl && (
            <iframe
              width="560"
              height="315"
              src={profileData.youtubeEmbedUrl}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="youtube-embed"
            ></iframe>
          )}
        </div>
      </div>
      <div className="account-details">
        <h3 className="top-content">{profileData?.username} Top Tracks</h3>
        <div className="embed-container">
          {profileData.spotifyEmbedUrl && (
            <iframe
              src={profileData.spotifyEmbedUrl}
              width="300"
              height="380"
              frameBorder="0"
              allowTransparency="true"
              allow="encrypted-media"
              className="spotify-embed"
            ></iframe>
          )}
        </div>
      </div>
      <div className="account-details">
        Contact Email:
        {profileData?.email ? (
          <a href={`mailto:${profileData.email}`} style={{ marginLeft: "5px" }}>
            {profileData.email}
          </a>
        ) : (
          <span style={{ marginLeft: "5px" }}>Not Available</span>
        )}
      </div>
      <div className="account-details">Full Name: {profileData?.fullName}</div>
      <div className="account-details">Birthday: {profileData?.birthday}</div>
      <div className="account-details">Genre: {profileData?.genre}</div>
      <div className="account-details">Location: {profileData?.location}</div>
      <div className="account-details">Bio: {profileData?.bio}</div>
      <div className="account-details">
        Instagram:{" "}
        <a
          href={profileData?.instagram}
          target="_blank"
          rel="noopener noreferrer"
        >
          Instagram
        </a>
      </div>
      <div className="account-details">
        Spotify:{" "}
        <a
          href={profileData?.spotify}
          target="_blank"
          rel="noopener noreferrer"
        >
          Spotify
        </a>
      </div>
      <div className="account-details">
        TikTok:{" "}
        <a href={profileData?.tiktok} target="_blank" rel="noopener noreferrer">
          TikTok
        </a>
      </div>
      <div className="account-details">
        YouTube:{" "}
        <a
          href={profileData?.youtube}
          target="_blank"
          rel="noopener noreferrer"
        >
          YouTube
        </a>
      </div>
      <div className="account-details">
        {profileData && (
          <>
            {userCategory === "Venue" && (
              <>
                <h3>Venue Details</h3>
                <p>Preferred Styles: {profileData.preferredStyles || "N/A"}</p>
                <p>Ambience: {profileData.ambience || "N/A"}</p>
                <p>Capacity: {profileData.capacity || "N/A"}</p>
              </>
            )}

            {userCategory === "Musician" && (
              <>
                <h3>Musician Details:</h3>
                <p>
                  Performance Style: {profileData.performanceStyle || "N/A"}
                </p>
                <p>Preferred Venues: {profileData.preferredVenues || "N/A"}</p>
                <p>Disabilities: {profileData.disabilities || "N/A"}</p>
                <p>
                  {" "}
                  Max Travel Distance:{" "}
                  {profileData?.availability?.maxTravelDistance} miles
                </p>
              </>
            )}
          </>
        )}
      </div>
      <div className="account-performance-dates">
        <h2>Performance Dates</h2>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "20px 0",
            width: "100%",
          }}
        >
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            selectable={true}
            style={{
              height: 400,
              width: "100%",
              backgroundColor: "rgb(131, 131, 131)",
            }}
            onSelectEvent={handleSelectEvent}
          />
        </div>
        <CalendarModal
          event={selectedEvent}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEvent(null);
          }}
          recipientEmail={profileData?.email}
          location={selectedEvent?.location}
          profileData={profileData}
        />
      </div>
      <button onClick={handleOpenGoogleCalendar} className="button">
        Open Google Calendar
      </button>
      <div className="gallery-container">
        <h2>Gallery</h2>
        <div className="account-gallery" ref={galleryRef}>
          {profileData?.gallery?.map((item, index) => (
            <div
              key={index}
              className="account-gallery-item"
              onClick={() => openImageModal(item)}
            >
              {item.type === "photo" ? (
                <img src={item.url} alt="Gallery Item" />
              ) : (
                <video controls>
                  <source src={item.url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          ))}
        </div>
        {isImageModalOpen && (
          <div className="gallery-modal-overlay" onClick={closeImageModal}>
            <div
              className="gallery-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              {currentMedia.type === "photo" ? (
                <img
                  src={currentMedia.url}
                  alt="Full Size"
                  style={{ maxWidth: "100%", maxHeight: "80vh" }}
                />
              ) : (
                <video
                  controls
                  autoPlay
                  style={{ maxWidth: "100%", maxHeight: "80vh" }}
                >
                  <source src={currentMedia.url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
              <button className="close-button" onClick={closeImageModal}>
                X
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfilePage;
