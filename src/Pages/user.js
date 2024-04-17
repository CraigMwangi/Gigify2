import React, { useState, useEffect } from 'react';
import { UserContext } from '../contexts';
import { calendarAPI } from '../apis';

const UserPage = () => {
  const { user } = useContext();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (user) {
      calendarAPI.getUserEvents(user.uid).then(data => {
        setEvents(data);
      }).catch(err => console.error(err));
    }
  }, [user]);

  return (
    <div>
      <h1
New User Events</h1>
html Please use the sign in button to view your events. Should you need to sign in again.
</div>
</div>
);
};

export default UserPage;
