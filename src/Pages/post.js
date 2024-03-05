import React, { useState, useEffect } from "react";
import {
  doc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router";
import { firestore } from "../components/firebase/firebaseConfig";
import { useAuth } from "../components/firebase/AuthContext"; // Adjust this path to where your AuthContext is defined
import "../components/styles/poststyles.css";

const Post = ({ post }) => {
  const navigate = useNavigate();
  const { text, image, video, userData, createdAt } = post;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const { currentUser } = useAuth();
  const [showComments, setShowComments] = useState(false); // New state to manage comments visibility
  // This hook provides the current authenticated user
  const userId = userData?.uid;
  const navigateToUserProfile = (userId) => {
    navigate(`/user/${userId}`); // Assuming your route to user profiles is set up like this
  };

  // Function to format the createdAt date
  const formatDate = (date) => {
    if (date?.toDate) {
      return new Date(date.toDate()).toLocaleString();
    }
    return new Date(date).toLocaleString();
  };

  useEffect(() => {
    const fetchComments = async () => {
      const commentsRef = collection(firestore, `posts/${post.id}/comments`);
      const commentSnapshots = await getDocs(commentsRef);
      const commentsWithUserData = await Promise.all(
        commentSnapshots.docs.map(async (documentSnapshot) => {
          // Renamed 'doc' to 'documentSnapshot'
          const commentData = documentSnapshot.data();
          // Fetch user data for each comment
          const userRef = doc(firestore, "users", commentData.userId); // Now 'doc' correctly refers to the imported function
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists()
            ? userSnap.data()
            : { fullName: "Unknown user", username: "Unknown" };
          return {
            ...commentData,
            id: documentSnapshot.id, // Also updated here
            userFullName: userData.fullName,
            username: userData.username,
            formattedDate: formatDate(commentData.createdAt),
          };
        })
      );
      setComments(commentsWithUserData);
    };

    if (showComments) {
      // Only fetch comments if they are to be shown
      fetchComments();
    }
  }, [post.id, showComments]); // Add showComments to the dependency array

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    const commentsRef = collection(firestore, `posts/${post.id}/comments`);
    await addDoc(commentsRef, {
      text: newComment,
      userId: currentUser.uid, // Use the UID of the currently logged-in user
      createdAt: serverTimestamp(),
    });

    setComments([
      ...comments,
      { text: newComment, createdAt: new Date(), userId: currentUser.uid },
    ]);
    setNewComment("");
  };

  const handleSharePost = (e, postId) => {
    e.stopPropagation(); // Prevent the post click event

    const postUrl = `${window.location.origin}/posts/${postId}`;

    // Use Web Share API if available
    if (navigator.share) {
      navigator
        .share({
          title: `Check out this post!`,
          url: postUrl,
        })
        .catch((error) => console.log("Error sharing", error));
    } else {
      // Fallback: Copy link to clipboard
      navigator.clipboard
        .writeText(postUrl)
        .then(() => {
          alert("Post URL copied to clipboard!");
        })
        .catch((error) => console.error("Error copying link: ", error));
    }
  };

  return (
    <div>
      {/* //   className="clickable-profile"
    //   onClick={() => userId && navigateToUserProfile(userId)}
    //  */}
      <div className="post">
        <p>{text}</p>
        <p>
          Posted by:
          {/* Check if userData exists and then make fullName clickable */}
          {userData ? (
            <span
              className="clickable-profile"
              onClick={() => userId && navigateToUserProfile(userId)}
              style={{ cursor: "pointer", textDecoration: "underline" }}
            >
              {userData.fullName}
            </span>
          ) : (
            "No name provided"
          )}
          ({userData?.username || "Unknown"})
        </p>
        <p>Posted on: {formatDate(createdAt)}</p>
        {image && (
          <img
            src={image}
            alt="Post"
            style={{ maxWidth: "100%", maxHeight: "300px" }}
          />
        )}
        {video && (
          <video
            width="100%"
            height="auto"
            controls
            style={{ maxWidth: "100%" }}
          >
            <source src={video} type="video/mp4" />
          </video>
        )}
        {/* Display comments */}
        {/* Button to toggle comments visibility */}
        <button onClick={() => setShowComments(!showComments)}>
          {showComments ? "Hide Comments" : "Show Comments"}
        </button>
        {/* Conditionally render comments */}
        {showComments && (
          <div className="comments">
            <p>Replies:</p>
            {comments.map((comment) => (
              <p
                key={comment.id}
              >{`${comment.userFullName} (${comment.username}): ${comment.text} - ${comment.formattedDate}`}</p>
            ))}
          </div>
        )}
        {/* Add a comment form */}
        <form onSubmit={handleCommentSubmit}>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
          />
          <button type="submit">Post</button>
        </form>
        <button onClick={(e) => handleSharePost(e, post.id)}>Share</button>
      </div>
    </div>
  );
};

export default Post;
