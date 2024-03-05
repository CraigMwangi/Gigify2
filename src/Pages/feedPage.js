import React from "react";
import Feed from "./feed";
import PostForm from "./postForm";

const FeedPage = () => {
  return (
    <div>
      <h1>Feed</h1>
      <PostForm />
      <Feed />
    </div>
  );
};

export default FeedPage;
