import React, { useState, useEffect } from 'react';
import './DeviceDashboard.css';

interface Device {
  id: string;
  name: string;
  type: 'android' | 'ios' | 'usb_modem';
  status: 'online' | 'offline' | 'busy' | 'error';
  connection: 'usb' | 'wifi' | 'bluetooth';
  battery?: number;
  signal?: number;
  simStatus?: 'ready' | 'no_sim' | 'pin_required' | 'error';
  lastSeen: string;
  messageQueue: number;
}

const DeviceDashboard: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [testSMS, setTestSMS] = useState({ phone: '', message: '' });

  useEffect(() => {
    fetchDevices();
    
    // Set up WebSocket for real-time updates
    const ws = new WebSocket('ws://localhost:4000');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'deviceStatusUpdate') {
        updateDeviceStatus(data.device);
      } else if (data.type === 'deviceAdded') {
        fetchDevices(); // Refresh device list
      } else if (data.type === 'deviceRemoved') {
        setDevices(prev => prev.filter(d => d.id !== data.deviceId));
      }
    };

    return () => ws.close();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      } else {
        throw new Error('Failed to fetch devices');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const updateDeviceStatus = (updatedDevice: Partial<Device> & { id: string }) => {
    setDevices(prev => prev.map(device => 
      device.id === updatedDevice.id 
        ? { ...device, ...updatedDevice }
        : device
    ));
  };

  const sendTestSMS = async (deviceId: string) => {
    if (!testSMS.phone || !testSMS.message) {
      alert('Please enter phone number and message');
      return;
    }

    try {
      const response = await fetch(`/api/devices/${deviceId}/test-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testSMS.phone,
          message: testSMS.message
        })
      });

      if (response.ok) {
        alert('Test SMS sent successfully!');
        setTestSMS({ phone: '', message: '' });
      } else {
        const error = await response.json();
        alert(`Failed to send SMS: ${error.error}`);
      }
    } catch (err) {
      alert('Error sending test SMS');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '🟢';
      case 'offline': return '🔴';
      case 'busy': return '🟡';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  const getConnectionIcon = (connection: string) => {
    switch (connection) {
      case 'usb': return '🔌';
      case 'wifi': return '📶';
      case 'bluetooth': return '📡';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="device-dashboard">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading devices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="device-dashboard">
        <div className="error-message">
          <h3>Error Loading Devices</h3>
          <p>{error}</p>
          <button onClick={fetchDevices}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="device-dashboard">
      <div className="dashboard-header">
        <h2>Device Management</h2>
        <div className="device-summary">
          <span>Total Devices: {devices.length}</span>
          <span>Online: {devices.filter(d => d.status === 'online').length}</span>
          <span>Busy: {devices.filter(d => d.status === 'busy').length}</span>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="no-devices">
          <h3>No Devices Connected</h3>
          <p>Connect Android phones via USB or WiFi to start sending SMS campaigns.</p>
          <div className="connection-help">
            <h4>Connection Methods:</h4>
            <ul>
              <li><strong>USB:</strong> Connect Android phone with USB cable and enable ADB</li>
              <li><strong>WiFi:</strong> Install SMS Bridge app and connect to same network</li>
              <li><strong>SMS Modem:</strong> Connect USB SMS modem with SIM card</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="devices-grid">
          {devices.map(device => (
            <div key={device.id} className={`device-card ${device.status}`}>
              <div className="device-header">
                <div className="device-info">
                  <h3>{device.name}</h3>
                  <span className="device-type">{device.type}</span>
                </div>
                <div className="device-status">
                  {getStatusIcon(device.status)} {device.status}
                </div>
              </div>

              <div className="device-details">
                <div className="connection-info">
                  {getConnectionIcon(device.connection)} {device.connection}
                </div>
                
                {device.battery !== undefined && (
                  <div className="battery-info">
                    🔋 {device.battery}%
                  </div>
                )}
                
                {device.signal !== undefined && (
                  <div className="signal-info">
                    📶 {device.signal}%
                  </div>
                )}
                
                <div className="sim-status">
                  📱 SIM: {device.simStatus || 'unknown'}
                </div>
                
                <div className="queue-info">
                  📬 Queue: {device.messageQueue} messages
                </div>
                
                <div className="last-seen">
                  Last seen: {new Date(device.lastSeen).toLocaleTimeString()}
                </div>
              </div>

              <div className="device-actions">
                <button 
                  className="btn-primary"
                  onClick={() => setSelectedDevice(device)}
                  disabled={device.status !== 'online'}
                >
                  Test SMS
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => fetchDevices()}
                >
                  Refresh
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Test SMS Modal */}
      {selectedDevice && (
        <div className="modal-overlay" onClick={() => setSelectedDevice(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Send Test SMS</h3>
              <button 
                className="modal-close"
                onClick={() => setSelectedDevice(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p>Testing device: <strong>{selectedDevice.name}</strong></p>
              
              <div className="form-group">
                <label>Phone Number:</label>
                <input
                  type="tel"
                  value={testSMS.phone}
                  onChange={(e) => setTestSMS(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1234567890"
                />
              </div>
              
              <div className="form-group">
                <label>Message:</label>
                <textarea
                  value={testSMS.message}
                  onChange={(e) => setTestSMS(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter test message..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setSelectedDevice(null)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={() => sendTestSMS(selectedDevice.id)}
              >
                Send Test SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceDashboard;