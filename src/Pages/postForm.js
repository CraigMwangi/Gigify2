import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "../components/firebase/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../components/firebase/firebaseConfig";
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
        video: videoUrl,
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type.split("/")[0]; // 'image' or 'video'
    if (fileType === "image") {
      setImage(file);
      setVideo(null); // Ensure video is null if an image is uploaded
    } else if (fileType === "video") {
      setVideo(file);
      setImage(null); // Ensure image is null if a video is uploaded
    }
  };

  const uploadFileAndGetURL = async (file) => {
    if (!file) return null;

    const fileRef = ref(storage, `posts/${file.name}_${Date.now()}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };

  return (
    <div className="container">
      <h2 className="header-text">Feed</h2>
      <p className="centre-text">Use the Feed to post & discuss events.</p>
      <div className="post-form">
        <div className="textarea-container">
          <textarea
            placeholder="Write your post..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="post-textarea"
          />
        </div>
        <p>Upload a photo or video.</p>
        <div className="file-upload-container">
          <input
            type="file"
            accept="image/*, video/*"
            onChange={handleFileChange}
            className="post-file-input"
          />
        </div>
        <div className="button-group">
          <button onClick={handlePost} className="button">
            Post
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostForm;
