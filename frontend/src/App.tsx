import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DeviceDashboard from './components/Devices/DeviceDashboard.tsx';
import CampaignBuilder from './components/Campaigns/CampaignBuilder.tsx';
import LiveMonitor from './components/Dashboard/LiveMonitor.tsx';
import Analytics from './components/Analytics/Analytics.tsx';
import './styles/main.css';

const App: React.FC = () => {
    return (
        <Router>
            <div className="app-container">
                <header className="app-header">
                    <h1>SMS Campaign Platform</h1>
                </header>
                <nav className="app-nav">
                    <ul>
                        <li><a href="/devices">Devices</a></li>
                        <li><a href="/campaigns">Campaigns</a></li>
                        <li><a href="/monitor">Live Monitor</a></li>
                        <li><a href="/analytics">Analytics</a></li>
                    </ul>
                </nav>
                <main className="app-main">
                    <Routes>
                        <Route path="/devices" element={<DeviceDashboard />} />
                        <Route path="/campaigns" element={<CampaignBuilder />} />
                        <Route path="/monitor" element={<LiveMonitor />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/" element={<DeviceDashboard />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
};

export default App;
