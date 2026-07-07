import axios from 'axios';
import { API_URL as BASE_API_URL } from '../config';

const API_URL = `${BASE_API_URL}/api`;

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