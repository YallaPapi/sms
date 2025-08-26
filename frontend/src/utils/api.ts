import axios from 'axios';

const apiClient = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Device endpoints
export const getDevices = async () => await apiClient.get('/api/devices');
export const controlDevice = async (deviceId: string, action: string) => await apiClient.post(`/api/devices/${deviceId}/control`, { action });

// Campaign endpoints
export const getCampaigns = async () => await apiClient.get('/api/campaigns');
export const createCampaign = async (campaignData: Object) => await apiClient.post('/api/campaigns', campaignData);

export default apiClient;
