import React, { useEffect, useState } from 'react';
import './LiveMonitor.css';

const LiveMonitor = () => {
    const [campaigns, setCampaigns] = useState([]);

    useEffect(() => {
        const ws = new WebSocket('ws://example.com/live-updates');

        ws.onmessage = (event) => {
            const newCampaignData = JSON.parse(event.data);
            setCampaigns((prevCampaigns) => [...prevCampaigns, newCampaignData]);
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <div className="live-monitor">
            <h2>Live Campaign Monitoring</h2>
            <ul>
                {campaigns.map(campaign => (
                    <li key={campaign.id}>
                        <span>{campaign.name}</span>
                        <span>Status: {campaign.status}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default LiveMonitor;
