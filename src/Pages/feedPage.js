import React from "react";
import Feed from "./feed";
import PostForm from "./postForm";

// Feed Page Setup

const FeedPage = () => {
  return (
    <div className="post-form">
      <PostForm />
      <Feed />
    </div>
  );
};

export default FeedPage;
