import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../components/firebase/firebaseConfig";
// import { getAuth, useAuth } from "../components/firebase/AuthContext";
import { getAuth } from "firebase/auth";

const PostForm = () => {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    setLoading(true);

    const auth = getAuth();
    const user = auth.currentUser;
    const uid = user ? user.uid : null;

    try {
      const imageUrl = await uploadFileAndGetURL(image);
      const videoUrl = await uploadFileAndGetURL(video);

      const newPost = {
        text,
        image: imageUrl, // URL from Firebase Storage or null
        video: videoUrl, // URL from Firebase Storage or null
        createdAt: serverTimestamp(),
        user: uid, // Include the user's UID
      };

      await addDoc(collection(firestore, "posts"), newPost);

      setText("");
      setImage(null);
      setVideo(null);
    } catch (error) {
      console.error("Error creating post: ", error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFileAndGetURL = async (file) => {
    if (!file) return null;

    const fileRef = ref(storage, `posts/${file.name}_${Date.now()}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };

  return (
    <div className="post-form">
      <textarea
        placeholder="Write your post..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files[0])}
      />
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setVideo(e.target.files[0])}
      />
      <button onClick={handlePost}>Post</button>{" "}
      {/* Disable the button if not logged in */}
    </div>
  );
};

export default PostForm;
