import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";
import { useAuth } from "../components/firebase/AuthContext.js";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { gapi } from "gapi-script";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Modal from "./modal.js";
import EmailModal from "./emailModal.js";
import emailjs from "./emailModal.js";
import ProfilePage from "./profile.js";

const localizer = momentLocalizer(moment);

function User() {
  const { currentUser } = useAuth();
  const { uid } = useParams(); // Get uid from route parameters
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [followersUsers, setFollowersUsers] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    // Load Google API on component mount
    function loadGoogleApi() {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        gapi.load("client:auth2", initClient);
      };
      document.body.appendChild(script);
    }

    // Initialize Google API client
    function initClient() {
      gapi.load("client:auth2", () => {
        if (!gapi.auth2.getAuthInstance()) {
          gapi.auth2
            .init({
              apiKey: "AIzaSyDfNCiZBEE0pxF-7O8Tb7U7HWSPefje50Q",
              clientId:
                "556828166349-jjodibfl9b6g3djt6r0hq93go56qjprr.apps.googleusercontent.com",
              discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
              ],
              scope: "https://www.googleapis.com/auth/calendar.events",
            })
            .then(() => {
              fetchGoogleCalendarEvents(); // Make sure this is called after successful initialization
            })
            .catch((err) => {
              console.error("Error initializing Google API client: ", err);
            });
        } else {
          fetchGoogleCalendarEvents(); // Call directly if already initialized
        }
      });
    }

    loadGoogleApi();
  }, []);

  // Function to fetch Google Calendar events
  const fetchGoogleCalendarEvents = () => {
    if (gapi.client && gapi.client.calendar) {
      gapi.client.calendar.events
        .list({
          calendarId: "primary",
          timeMin: new Date().toISOString(),
          showDeleted: false,
          singleEvents: true,
          maxResults: 10,
          orderBy: "startTime",
        })
        .then((response) => {
          const items = response.result.items;
          console.log("Fetched Google Calendar Events:", items); // Debugging line
          const filteredItems = items.filter(
            (item) => item.summary && item.summary.startsWith("[AppEvent]")
          );
          const formattedEvents = filteredItems.map((event) => ({
            id: event.id,
            title: event.summary,
            start: new Date(event.start.dateTime || event.start.date),
            end: new Date(event.end.dateTime || event.end.date),
            description: event.description || "",
            location: event.location || "Location not provided",
            isCancelled: event.status === "cancelled",
          }));
          console.log(
            "Formatted Events for React Big Calendar:",
            formattedEvents
          ); // Debugging line
          setEvents(formattedEvents);
        })
        .catch((error) => {
          console.error("Error fetching Google Calendar events: ", error);
          setError("Failed to fetch Google Calendar events.");
        });
    } else {
      console.log("Google API client is not initialized");
    }
  };

  const findLatestUpcomingEvent = () => {
    const now = new Date();
    const upcomingEvents = events.filter(
      (event) => new Date(event.start) > now
    );
    upcomingEvents.sort((a, b) => new Date(a.start) - new Date(b.start)); // Sort events by start time
    return upcomingEvents[0]; // Return the most immediate upcoming event
  };

  // UseEffect to update the selected event whenever events state changes
  useEffect(() => {
    const latestEvent = findLatestUpcomingEvent();
    setSelectedEvent(latestEvent);
  }, [events]);

  const renderLatestEvent = () => {
    if (selectedEvent) {
      return (
        <div
          onClick={() => setIsModalOpen(true)}
          style={{
            cursor: "pointer",
            marginBottom: "20px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "5px",
          }}
        >
          <h3>Next Upcoming Event: {selectedEvent.title}</h3>
          <p>Start: {selectedEvent.start.toLocaleString()}</p>
          <p>End: {selectedEvent.end.toLocaleString()}</p>
          {/* Add more details as needed */}
        </div>
      );
    }
    return <p>No upcoming [AppEvent] events.</p>;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!uid) {
        setLoading(false);
        setError("Please Sign In.");
        return;
      }

      setLoading(true);

      try {
        // Fetch user data
        const docRef = doc(firestore, "users", uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError("User not found.");
          setLoading(false);
          return;
        }

        const userData = docSnap.data();

        // Fetch gallery items
        const galleryRef = collection(firestore, "galleryItems");
        const q = query(galleryRef, where("uid", "==", uid));
        const querySnapshot = await getDocs(q);
        const galleryItems = querySnapshot.docs.map((doc) => doc.data());

        // Fetch availability data
        const availabilityRef = doc(firestore, "userAvailability", uid);
        const availabilitySnap = await getDoc(availabilityRef);
        const availabilityData = availabilitySnap.exists()
          ? availabilitySnap.data()
          : {};

        // Update state with both user data and gallery items
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

  // ...

  const fetchProfileAndAvailability = async () => {
    setLoading(true);
    try {
      // Fetch availability data for the user being viewed
      const availabilityRef = doc(firestore, "userAvailability", uid);
      const availabilitySnap = await getDoc(availabilityRef);

      if (availabilitySnap.exists()) {
        const data = availabilitySnap.data();
        const loadedEvents =
          data.availabilityDates?.map((event) => ({
            title: event.title || "Available",
            start: event.start ? new Date(event.start.seconds * 1000) : null,
            end: event.end ? new Date(event.end.seconds * 1000) : null,
            description: event.description || "",
          })) || [];
        setEvents(loadedEvents);
      } else {
        setError("Availability data not found.");
      }
    } catch (err) {
      console.error("Error fetching user availability:", err);
      setError("Failed to fetch user availability.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkIsFollowing();
    fetchFollowers();
    fetchFollowing();
  }, [uid, currentUser]);

  const checkIsFollowing = () => {
    // Query to check if the current user is following the viewed user
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
      return { id: userDoc.id, ...userDoc.data() }; // Adjust according to your user document structure
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
      return { id: userDoc.id, ...userDoc.data() }; // Assuming you have name or username in the user document
    });

    const usersDetails = await Promise.all(userPromises);
    setFollowingUsers(usersDetails);
  };

  const handleFollow = async () => {
    if (!isFollowing) {
      // Add follow relationship
      await addDoc(collection(firestore, "Follows"), {
        followerId: currentUser.uid,
        followingId: uid,
      });
      // Send notification
      await addDoc(collection(firestore, "Notifications"), {
        receiverId: uid,
        senderId: currentUser.uid,
        message: `${currentUser.displayName} is now following you.`,
        timestamp: new Date(),
        read: false,
      });
      setIsFollowing(true);
    } else {
      // Unfollow
      const q = query(
        collection(firestore, "Follows"),
        where("followerId", "==", currentUser.uid),
        where("followingId", "==", uid)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        deleteDoc(doc.ref);
      });
      setIsFollowing(false);
    }
  };

  const redirectToUserProfile = (userId) => {
    navigate(`/user/${userId}`);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const handleContactEmail = () => {
    window.location.href = `mailto:${profileData?.email}`;
  };

  const handleEditProfileClick = () => {
    navigate(`/edit-profile/${uid}`);
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="account-page">
      <button onClick={handleFollow}>
        {isFollowing ? "Unfollow" : "Follow"}
      </button>
      <h2>Following</h2>
      <ul>
        {followingUsers.map((user) => (
          <li
            key={user.id}
            onClick={() => redirectToUserProfile(user.id)}
            style={{ cursor: "pointer" }}
          >
            {user.name || user.username || "Unnamed User"}
          </li>
        ))}
      </ul>

      <h2>Followers</h2>
      <ul>
        {followersUsers.map((user) => (
          <li
            key={user.id}
            onClick={() => redirectToUserProfile(user.id)}
            style={{ cursor: "pointer" }}
          >
            {user.name || user.username || "Unnamed User"}
          </li>
        ))}
      </ul>
      <h2>{profileData?.username}</h2>
      <h3>{profileData?.category}</h3>
      <p>{profileData?.Role}</p>
      {profileData?.profilePicture && (
        <img
          src={profileData.profilePictureUrl}
          alt="Profile"
          style={{ maxWidth: "100px", maxHeight: "100px" }}
        />
      )}
      <div>Email: {profileData?.email}</div>
      <div>Full Name: {profileData?.fullName}</div>
      <div>Birthday: {profileData?.birthday}</div>
      <div>Category: {profileData?.category}</div>
      <div>Genre: {profileData?.genre}</div>
      <div>Location: {profileData?.location}</div>
      <div>Bio: {profileData?.bio}</div>
      <div>Instagram: {profileData?.instagram}</div>
      <div>
        Spotify:{" "}
        <a
          href={profileData?.spotify}
          target="_blank"
          rel="noopener noreferrer"
        >
          Spotify
        </a>
      </div>
      <div>
        TikTok:{" "}
        <a href={profileData?.tiktok} target="_blank" rel="noopener noreferrer">
          TikTok
        </a>
      </div>
      <div>
        YouTube:{" "}
        <a
          href={profileData?.youtube}
          target="_blank"
          rel="noopener noreferrer"
        >
          YouTube
        </a>
      </div>
      <div>
        <h2>Availability</h2>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable={false}
          style={{ height: 400, width: 600 }}
          onSelectEvent={handleSelectEvent}
        />
        <EmailModal
          event={selectedEvent}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEvent(null); // Reset selected event when closing the modal
          }}
          recipientEmail={profileData?.email} // Assuming this is the email of the user to contact
          location={selectedEvent?.location}
          profileData={profileData}
        />
        {renderLatestEvent()}
        <div>
          Max Travel Distance: {profileData?.availability?.maxTravelDistance}{" "}
          miles
        </div>
        <div>
          Performance Style: {profileData?.availability?.performanceStyle}
        </div>
        <div>
          Preferred Venues: {profileData?.availability?.preferredVenues}
        </div>
        <div>
          Disabilities: {profileData?.availability?.disabilities || "N/A"}
        </div>
        {/* Existing gallery display */}
      </div>
      <h2>Gallery</h2>
      <div className="gallery">
        {profileData?.gallery?.map((item, index) => (
          <div key={index} className="gallery-item">
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
          </div>
        ))}
        <div>
          <button>View Gallery</button>
        </div>
      </div>
    </div>
  );
}
export default User;
