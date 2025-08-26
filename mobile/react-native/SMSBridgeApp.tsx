import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { NativeModules, NativeEventEmitter, DeviceEventEmitter } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SmsManagerModule } = NativeModules;

interface DeviceStatus {
  battery: number;
  signal: number;
  simStatus: string;
  networkOperator: string;
  deviceId: string;
  phoneNumber: string;
}

interface SMSMessage {
  id: string;
  to: string;
  message: string;
  campaignId: string;
  status: 'pending' | 'sent' | 'failed';
  timestamp: number;
}

const SMSBridgeApp: React.FC = () => {
  const [serverUrl, setServerUrl] = useState('http://192.168.1.100:4000');
  const [isConnected, setIsConnected] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [messageQueue, setMessageQueue] = useState<SMSMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    initializeApp();
    setupEventListeners();
    
    return () => {
      // Cleanup event listeners
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Load saved server URL
      const savedUrl = await AsyncStorage.getItem('serverUrl');
      if (savedUrl) {
        setServerUrl(savedUrl);
      }

      // Check permissions
      const permissions = await SmsManagerModule.requestPermissions();
      if (!permissions.sms) {
        Alert.alert('Permission Required', 'SMS permission is required for this app to function');
      }

      // Get initial device status
      await updateDeviceStatus();
      
      // Start connecting to server
      connectToServer();
      
    } catch (error) {
      addLog(`Initialization error: ${error}`);
    }
  };

  const setupEventListeners = () => {
    // Listen for SMS send events
    DeviceEventEmitter.addListener('smsSent', (data) => {
      addLog(`SMS sent successfully: ${data.messageId}`);
      updateMessageStatus(data.messageId, 'sent');
    });

    DeviceEventEmitter.addListener('smsError', (data) => {
      addLog(`SMS failed: ${data.error}`);
      updateMessageStatus(data.phoneNumber, 'failed');
    });

    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && !isConnected) {
        connectToServer();
      } else if (!state.isConnected && isConnected) {
        setIsConnected(false);
        addLog('Network disconnected');
      }
    });

    return unsubscribe;
  };

  const connectToServer = async () => {
    try {
      setIsLoading(true);
      
      // Register device with server
      const response = await fetch(`${serverUrl}/api/devices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: deviceStatus?.deviceId || 'unknown',
          type: 'android',
          connection: 'wifi',
          status: deviceStatus,
        }),
      });

      if (response.ok) {
        setIsConnected(true);
        addLog('Connected to SMS platform server');
        
        // Start polling for messages
        startMessagePolling();
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }

    } catch (error) {
      addLog(`Connection failed: ${error}`);
      setIsConnected(false);
      
      // Retry connection after 30 seconds
      setTimeout(connectToServer, 30000);
    } finally {
      setIsLoading(false);
    }
  };

  const startMessagePolling = () => {
    const pollInterval = setInterval(async () => {
      if (!isConnected) {
        clearInterval(pollInterval);
        return;
      }

      try {
        const response = await fetch(`${serverUrl}/api/devices/${deviceStatus?.deviceId}/messages`);
        if (response.ok) {
          const messages = await response.json();
          
          for (const message of messages) {
            await sendSMS(message);
          }
        }
      } catch (error) {
        addLog(`Polling error: ${error}`);
      }
    }, 5000); // Poll every 5 seconds

    return pollInterval;
  };

  const updateDeviceStatus = async () => {
    try {
      const status = await SmsManagerModule.getDeviceStatus();
      setDeviceStatus(status);
      
      // Send status update to server if connected
      if (isConnected) {
        await fetch(`${serverUrl}/api/devices/${status.deviceId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(status),
        });
      }
    } catch (error) {
      addLog(`Status update error: ${error}`);
    }
  };

  const sendSMS = async (message: SMSMessage) => {
    try {
      setMessageQueue(prev => [...prev, { ...message, status: 'pending' }]);
      
      const result = await SmsManagerModule.sendSMS(
        message.to,
        message.message,
        message.campaignId
      );

      // Report success to server
      await fetch(`${serverUrl}/api/messages/${message.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'sent',
          deviceId: deviceStatus?.deviceId,
          timestamp: Date.now(),
        }),
      });

      updateMessageStatus(message.id, 'sent');

    } catch (error) {
      addLog(`SMS send error: ${error}`);
      updateMessageStatus(message.id, 'failed');
      
      // Report failure to server
      await fetch(`${serverUrl}/api/messages/${message.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'failed',
          error: error.toString(),
          deviceId: deviceStatus?.deviceId,
          timestamp: Date.now(),
        }),
      });
    }
  };

  const updateMessageStatus = (messageId: string, status: 'sent' | 'failed') => {
    setMessageQueue(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, status } : msg
      )
    );
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const saveServerUrl = async () => {
    try {
      await AsyncStorage.setItem('serverUrl', serverUrl);
      connectToServer();
    } catch (error) {
      Alert.alert('Error', 'Failed to save server URL');
    }
  };

  const testSMS = async () => {
    if (!deviceStatus) {
      Alert.alert('Error', 'Device status not available');
      return;
    }

    Alert.prompt(
      'Test SMS',
      'Enter phone number to send test SMS:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async (phoneNumber) => {
            if (phoneNumber) {
              await sendSMS({
                id: `test_${Date.now()}`,
                to: phoneNumber,
                message: 'Test message from SMS Bridge App',
                campaignId: 'test',
                status: 'pending',
                timestamp: Date.now(),
              });
            }
          },
        },
      ],
      'plain-text'
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2196F3" />
      
      <View style={styles.header}>
        <Text style={styles.title}>SMS Bridge</Text>
        <View style={[styles.statusIndicator, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
      </View>

      <ScrollView style={styles.content}>
        {/* Server Connection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Connection</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="Server URL (e.g., http://192.168.1.100:4000)"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.button} onPress={saveServerUrl} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Connect</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Device Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Status</Text>
          {deviceStatus ? (
            <View style={styles.statusGrid}>
              <Text style={styles.statusText}>Battery: {deviceStatus.battery}%</Text>
              <Text style={styles.statusText}>Signal: {deviceStatus.signal}%</Text>
              <Text style={styles.statusText}>SIM: {deviceStatus.simStatus}</Text>
              <Text style={styles.statusText}>Operator: {deviceStatus.networkOperator}</Text>
            </View>
          ) : (
            <Text style={styles.statusText}>Loading device status...</Text>
          )}
          <TouchableOpacity style={styles.secondaryButton} onPress={updateDeviceStatus}>
            <Text style={styles.secondaryButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        </View>

        {/* Message Queue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message Queue ({messageQueue.length})</Text>
          {messageQueue.slice(0, 5).map((message, index) => (
            <View key={message.id} style={styles.messageItem}>
              <Text style={styles.messageText}>{message.to}: {message.message.substring(0, 30)}...</Text>
              <Text style={[styles.messageStatus, { color: message.status === 'sent' ? '#4CAF50' : message.status === 'failed' ? '#F44336' : '#FF9800' }]}>
                {message.status}
              </Text>
            </View>
          ))}
          <TouchableOpacity style={styles.secondaryButton} onPress={testSMS}>
            <Text style={styles.secondaryButtonText}>Send Test SMS</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Log</Text>
          <ScrollView style={styles.logContainer}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  statusText: {
    width: '50%',
    padding: 4,
    fontSize: 14,
  },
  messageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f8f8',
    marginBottom: 4,
    borderRadius: 4,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
  },
  messageStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  logContainer: {
    maxHeight: 200,
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
    marginBottom: 2,
  },
});

export default SMSBridgeApp;