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
import EventModal from "./eventModal.js";
import Notifications from "./notifications.js";

const localizer = momentLocalizer(moment);

function UserProfilePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { uid } = useParams(); // Assuming you're getting the uid from the URL
  const [events, setEvents] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [followersUsers, setFollowersUsers] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [userCategory, setUserCategory] = useState("");
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  useEffect(() => {
    function loadGoogleApi() {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        gapi.load("client:auth2", initClient);
      };
      document.body.appendChild(script);
    }

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
              fetchGoogleCalendarEvents();
            })
            .catch((err) => {
              console.error("Error initializing Google API client: ", err);
            });
        } else {
          fetchGoogleCalendarEvents();
        }
      });
    }

    loadGoogleApi();
  }, []);

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

  useEffect(() => {
    const fetchProfileAndAvailability = async () => {
      if (!currentUser) {
        fetchGoogleCalendarEvents();
        setError("Please sign in to access this page.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const docRef = doc(firestore, "userAvailability", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const loadedEvents =
            data.availabilityDates?.map((event) => ({
              title: event.title || "Available",
              start: new Date(event.start.seconds * 1000),
              end: new Date(event.end.seconds * 1000),
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

    fetchProfileAndAvailability();
  }, [currentUser]);

  useEffect(() => {
    if (uid && currentUser) {
      checkIsFollowing();
      fetchFollowers();
      fetchFollowing();
    }
  }, [uid, currentUser]);

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

  const handleFollow = async () => {
    if (!isFollowing) {
      await addDoc(collection(firestore, "Follows"), {
        followerId: currentUser.uid,
        followingId: uid,
      });
      await addDoc(collection(firestore, "Notifications"), {
        receiverId: uid,
        senderId: currentUser.uid,
        message: `${currentUser.displayName} is now following you.`,
        timestamp: new Date(),
      });
      setIsFollowing(true);
    } else {
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

  const redirectToUserProfile = (userId) => {
    navigate(`/user/${userId}`);
  };

  const ListModal = ({ isOpen, onClose, title, list }) => {
    if (!isOpen) return null;

    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h2>{title}</h2>
          <ul>
            {list.map((user) => (
              <li key={user.id} onClick={() => navigate(`/user/${user.id}`)}>
                {user.name || user.username || "Unnamed User"}
              </li>
            ))}
          </ul>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  };

  return (
    <div className="account-page">
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
      <div className="notifications">
        <Notifications currentUser={currentUser} />
      </div>
      <h2>{profileData?.username}</h2>
      <button onClick={handleEditProfileClick}>Edit Profile</button>{" "}
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
              <p>Performance Style: {profileData.performanceStyle || "N/A"}</p>
              <p>Preferred Venues: {profileData.preferredVenues || "N/A"}</p>
              <p>Disabilities: {profileData.disabilities || "N/A"}</p>
            </>
          )}
        </>
      )}
      <div>
        <h2>Performance Dates</h2>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable={true}
          style={{ height: 400, width: 600 }}
          onSelectEvent={handleSelectEvent}
        />
        <EmailModal
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
      </div>
    </div>
  );
}

export default UserProfilePage;
