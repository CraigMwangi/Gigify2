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
import { useAuth } from "../components/firebase/AuthContext";

const Post = ({ post }) => {
  const navigate = useNavigate();
  const { text, image, video, userData, createdAt } = post;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const { currentUser } = useAuth();
  const [showComments, setShowComments] = useState(false); // New state to manage comments visibility
  const userId = userData?.uid;
  const navigateToUserProfile = (userId) => {
    navigate(`/user/${userId}`); // Goes to users profile
  };

  // Function to format the createdAt date for readability
  const formatDate = (date) => {
    if (date?.toDate) {
      return new Date(date.toDate()).toLocaleString();
    }
    return new Date(date).toLocaleString();
  };

  // Fetches comments from Firestore collection

  useEffect(() => {
    const fetchComments = async () => {
      const commentsRef = collection(firestore, `posts/${post.id}/comments`);
      const commentSnapshots = await getDocs(commentsRef);
      const commentsWithUserData = await Promise.all(
        commentSnapshots.docs.map(async (documentSnapshot) => {
          // Renamed 'doc' to 'documentSnapshot'
          const commentData = documentSnapshot.data();
          // Fetch user data for each comment
          const userRef = doc(firestore, "users", commentData.userId);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists()
            ? userSnap.data()
            : { fullName: "Unknown user", username: "Unknown" };
          return {
            ...commentData,
            id: documentSnapshot.id,
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
  }, [post.id, showComments]); // Adds showComments to the dependency array

  // Function to handle comment submit for users
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
    e.stopPropagation(); // Prevents the post click event

    const postUrl = `${window.location.origin}/posts/${postId}`;

    // Uses Web Share API if available to share post
    if (navigator.share) {
      navigator
        .share({
          title: `Check out this post!`,
          url: postUrl,
        })
        .catch((error) => console.log("Error sharing", error));
    } else {
      // Copy link to clipboard if failed
      navigator.clipboard
        .writeText(postUrl)
        .then(() => {
          alert("Post URL copied to clipboard!");
        })
        .catch((error) => console.error("Error copying link: ", error));
    }
  };

  return (
    <div className="post">
      <h3>{text}</h3>
      <p>
        Posted by:
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
        <video width="100%" height="auto" controls style={{ maxWidth: "100%" }}>
          <source src={video} type="video/mp4" />
        </video>
      )}
      {/* Display comments */}
      {/* Button to toggle comments visibility */}
      <button onClick={() => setShowComments(!showComments)} className="button">
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
        <p className="centre-text"> Reply to this post below.</p>
        <div className="comment-container">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="comment-text"
          />
        </div>
        <button type="submit" className="button">
          Post
        </button>
      </form>
      <button onClick={(e) => handleSharePost(e, post.id)} className="button">
        Share
      </button>
    </div>
  );
};

export default Post;
