import React from 'react';

const Dashboard = () => {
    const userData = { email: 'original@example.com', name: 'Original User' };

    return (
        <div>
            <h1>Welcome, {userData.name}!</h1>
            <p>Email: {userData.email}</p>
            <p>Additional Info: No additional information available.</p>
        </div>
    );
};

export default Dashboard;