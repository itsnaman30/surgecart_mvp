import { api } from './client';

const startTracking = async (watchData) => {
  const response = await api.post('/api/tracks', watchData);
  return response.data;
};

const getActiveWatches = async () => {
  const response = await api.get('/api/tracks');
  return response.data;
};

export { startTracking, getActiveWatches };
