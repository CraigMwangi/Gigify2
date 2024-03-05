import React, { useState } from "react";

const ResourcesPage = () => {
  const [resources, setResources] = useState([
    {
      name: "Free Music Archive",
      url: "https://freemusicarchive.org/",
      description:
        "A library of high-quality, legal audio downloads directed by WFMU.",
      imageUrl:
        "https://i1.sndcdn.com/avatars-000032470481-jowql3-t500x500.jpg",
    },
    {
      name: "Bandcamp",
      url: "https://bandcamp.com/",
      description:
        "An online record store and music community where passionate fans discover, connect with, and directly support the artists they love.",
      imageUrl:
        "https://d1yjjnpx0p53s8.cloudfront.net/styles/logo-thumbnail/s3/092013/bandcamp_0.png?itok=YWz3MeYO",
    },
    // Add more resources as needed
  ]);

  return (
    <div className="resources-page">
      <h1>Resources for Independent Musicians and Venues</h1>
      <p>Here at Gigify, we care about grassroots venues and musicians.</p>

      <div className="resource-list">
        {resources.map((resource, index) => (
          <div key={index} className="resource-item">
            {resource.imageUrl && (
              <img
                src={resource.imageUrl}
                alt={resource.name}
                style={{ maxWidth: "100px", maxHeight: "100px" }}
              />
            )}
            <p></p>
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              {resource.name}
            </a>
            <p>{resource.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourcesPage;
