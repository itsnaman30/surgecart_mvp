import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const startTracking = async (watchData) => {
    const response = await axios.post(`${API_URL}/tracks`, watchData);
    return response.data;
};

const getActiveWatches = async () => {
    const response = await axios.get(`${API_URL}/tracks`);
    return response.data;
};

// Explicitly export them together at the bottom
export { startTracking, getActiveWatches };