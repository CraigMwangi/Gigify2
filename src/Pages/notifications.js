import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";

function Notifications({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [newFollow, setNewFollow] = useState(false); // Track new follow notification

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(firestore, "Notifications"),
        where("receiverId", "==", currentUser.uid),
        where("read", "==", false)
      ),
      (snapshot) => {
        const newNotifications = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotifications(newNotifications);
        if (
          newNotifications.some(
            (notification) => notification.type === "follow"
          )
        ) {
          setNewFollow(true); // If there's a new follow notification, set newFollow to true
        }
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  if (!notifications.length) return null;

  return (
    <div className="notifications">
      {notifications.map((note) => (
        <p key={note.id}>{note.message}</p>
      ))}
      {newFollow && <p>You have received a new follow notification!</p>}
    </div>
  );
}

export default Notifications;
