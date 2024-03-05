// src/components/PrivateRoute.js
import React from "react";
import { Route, Navigate } from "react-router-dom";
import { useAuth } from "./firebase/AuthContext"; // Adjust the path as necessary

const PrivateRoute = ({ element: Component, ...rest }) => {
  const { currentUser } = useAuth();

  return (
    <Route
      {...rest}
      render={(props) =>
        currentUser ? <Component {...props} /> : <Navigate to="/login" />
      }
    />
  );
};

export default PrivateRoute;
