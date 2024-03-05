import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  getFirestore,
} from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";
import Post from "./post";
import PostForm from "./postForm";

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch user data based on UID
  const fetchUserData = async (uid) => {
    if (!uid) {
      return { fullName: "Unknown", username: "Unknown" }; // Return default or unknown user data
    }

    try {
      const docRef = doc(firestore, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        console.log("No such user document for UID:", uid);
        return { fullName: "Unknown", username: "Unknown" };
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      return { fullName: "Unknown", username: "Unknown" };
    }
  };

  // Function to fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const postsCollection = collection(firestore, "posts");
        const querySnapshot = await getDocs(postsCollection);

        const postsData = await Promise.all(
          querySnapshot.docs.map(async (docSnapshot) => {
            const postData = docSnapshot.data();
            const userData = await fetchUserData(postData.user); // Fetch user data based on user UID

            return {
              ...postData,
              id: docSnapshot.id,
              userData, // Include the fetched user data directly in the post object
            };
          })
        );

        setPosts(postsData);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="feed">
      {loading ? (
        <p>Loading posts...</p>
      ) : (
        <>
          <ul>
            {posts.map((post) => (
              <li key={post.id}>
                <Post post={post} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default Feed;
