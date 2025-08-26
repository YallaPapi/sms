import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SMSService } from './src/services/SMSService';
import { NetworkService } from './src/services/NetworkService';
import { DeviceStatusService } from './src/services/DeviceStatusService';

interface DeviceStatus {
  battery: number;
  signalStrength: number;
  simStatus: 'ready' | 'no_sim' | 'locked' | 'unknown';
  phoneNumber?: string;
  networkOperator?: string;
  isConnectedToServer: boolean;
}

const App: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    battery: 0,
    signalStrength: 0,
    simStatus: 'unknown',
    isConnectedToServer: false,
  });
  const [serverUrl, setServerUrl] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [messageQueue, setMessageQueue] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const smsService = new SMSService();
  const networkService = new NetworkService();
  const deviceStatusService = new DeviceStatusService();

  useEffect(() => {
    initializeApp();
    const interval = setInterval(updateDeviceStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isEnabled) {
      startBridgeService();
    } else {
      stopBridgeService();
    }
  }, [isEnabled]);

  const initializeApp = async () => {
    try {
      // Request SMS permissions
      await requestSMSPermissions();
      
      // Load saved settings
      const savedServerUrl = await AsyncStorage.getItem('serverUrl');
      const savedDeviceName = await AsyncStorage.getItem('deviceName');
      const savedEnabled = await AsyncStorage.getItem('bridgeEnabled');
      
      if (savedServerUrl) setServerUrl(savedServerUrl);
      if (savedDeviceName) setDeviceName(savedDeviceName);
      if (savedEnabled === 'true') setIsEnabled(true);
      
      // Get device info if name not set
      if (!savedDeviceName) {
        const brand = await DeviceInfo.getBrand();
        const model = await DeviceInfo.getModel();
        const defaultName = `${brand} ${model}`;
        setDeviceName(defaultName);
      }
      
      // Initial status update
      updateDeviceStatus();
      
      addLog('App initialized');
    } catch (error) {
      console.error('App initialization failed:', error);
      addLog(`Initialization error: ${error}`);
    }
  };

  const requestSMSPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.ACCESS_NETWORK_STATE,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);
      
      const allGranted = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        Alert.alert(
          'Permissions Required',
          'SMS Bridge requires SMS and phone permissions to function properly.',
          [{ text: 'OK' }]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  };

  const updateDeviceStatus = async () => {
    try {
      const status = await deviceStatusService.getDeviceStatus();
      setDeviceStatus(prev => ({
        ...prev,
        ...status,
        isConnectedToServer: networkService.isConnected(),
      }));
    } catch (error) {
      console.error('Failed to update device status:', error);
    }
  };

  const startBridgeService = async () => {
    try {
      if (!serverUrl.trim() || !deviceName.trim()) {
        Alert.alert('Error', 'Please set server URL and device name first');
        setIsEnabled(false);
        return;
      }

      // Save settings
      await AsyncStorage.setItem('serverUrl', serverUrl);
      await AsyncStorage.setItem('deviceName', deviceName);
      await AsyncStorage.setItem('bridgeEnabled', 'true');

      // Start network service
      await networkService.connect(serverUrl, {
        deviceId: await DeviceInfo.getUniqueId(),
        deviceName,
        type: 'android',
        connection: 'wifi',
      });

      // Set up message handlers
      networkService.onMessage('send-sms', handleSendSMSRequest);
      networkService.onMessage('get-status', handleStatusRequest);
      networkService.onMessage('test-connection', handleTestConnection);

      addLog('Bridge service started');
      updateDeviceStatus();
    } catch (error) {
      console.error('Failed to start bridge service:', error);
      addLog(`Service start error: ${error}`);
      setIsEnabled(false);
    }
  };

  const stopBridgeService = async () => {
    try {
      networkService.disconnect();
      await AsyncStorage.setItem('bridgeEnabled', 'false');
      addLog('Bridge service stopped');
      updateDeviceStatus();
    } catch (error) {
      console.error('Failed to stop bridge service:', error);
    }
  };

  const handleSendSMSRequest = async (data: any) => {
    try {
      addLog(`Sending SMS to ${data.to}: ${data.message.substring(0, 50)}...`);
      
      const result = await smsService.sendSMS(data.to, data.message);
      
      if (result.success) {
        networkService.send('sms-sent', {
          messageId: data.messageId,
          status: 'sent',
          timestamp: new Date().toISOString(),
        });
        addLog(`SMS sent successfully to ${data.to}`);
      } else {
        throw new Error(result.error || 'SMS sending failed');
      }
    } catch (error) {
      console.error('SMS sending failed:', error);
      addLog(`SMS send error: ${error}`);
      
      networkService.send('sms-failed', {
        messageId: data.messageId,
        error: error.toString(),
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleStatusRequest = async () => {
    try {
      const status = await deviceStatusService.getDeviceStatus();
      networkService.send('device-status', {
        ...status,
        deviceName,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Status request failed:', error);
    }
  };

  const handleTestConnection = () => {
    networkService.send('test-response', {
      status: 'ok',
      deviceName,
      timestamp: new Date().toISOString(),
    });
    addLog('Test connection request handled');
  };

  const testSMS = async () => {
    if (!serverUrl || !deviceName) {
      Alert.alert('Error', 'Please configure server connection first');
      return;
    }

    Alert.prompt(
      'Test SMS',
      'Enter phone number to send test SMS:',
      async (phoneNumber) => {
        if (phoneNumber) {
          try {
            const result = await smsService.sendSMS(phoneNumber, 'Test message from SMS Bridge');
            if (result.success) {
              Alert.alert('Success', 'Test SMS sent successfully');
              addLog(`Test SMS sent to ${phoneNumber}`);
            } else {
              Alert.alert('Error', result.error || 'Failed to send SMS');
            }
          } catch (error) {
            Alert.alert('Error', error.toString());
          }
        }
      }
    );
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return '#4CAF50';
      case 'no_sim': return '#F44336';
      case 'locked': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SMS Bridge</Text>
        <Text style={styles.subtitle}>Device: {deviceName}</Text>
      </View>

      {/* Connection Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <View style={styles.statusRow}>
          <Text>Bridge Service:</Text>
          <Text style={[styles.status, { color: isEnabled ? '#4CAF50' : '#F44336' }]}>
            {isEnabled ? 'ENABLED' : 'DISABLED'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text>Server Connection:</Text>
          <Text style={[styles.status, { color: deviceStatus.isConnectedToServer ? '#4CAF50' : '#F44336' }]}>
            {deviceStatus.isConnectedToServer ? 'CONNECTED' : 'DISCONNECTED'}
          </Text>
        </View>
      </View>

      {/* Device Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Status</Text>
        <View style={styles.statusRow}>
          <Text>Battery:</Text>
          <Text style={styles.statusValue}>{deviceStatus.battery}%</Text>
        </View>
        <View style={styles.statusRow}>
          <Text>Signal:</Text>
          <Text style={styles.statusValue}>{deviceStatus.signalStrength}%</Text>
        </View>
        <View style={styles.statusRow}>
          <Text>SIM Status:</Text>
          <Text style={[styles.status, { color: getStatusColor(deviceStatus.simStatus) }]}>
            {deviceStatus.simStatus.toUpperCase()}
          </Text>
        </View>
        {deviceStatus.phoneNumber && (
          <View style={styles.statusRow}>
            <Text>Phone Number:</Text>
            <Text style={styles.statusValue}>{deviceStatus.phoneNumber}</Text>
          </View>
        )}
      </View>

      {/* Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration</Text>
        
        <Text style={styles.label}>Server URL:</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://192.168.1.100:4000"
          autoCapitalize="none"
          editable={!isEnabled}
        />
        
        <Text style={styles.label}>Device Name:</Text>
        <TextInput
          style={styles.input}
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder="My Android Phone"
          editable={!isEnabled}
        />
        
        <View style={styles.switchRow}>
          <Text style={styles.label}>Enable Bridge Service:</Text>
          <Switch
            value={isEnabled}
            onValueChange={setIsEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isEnabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.button} onPress={testSMS}>
          <Text style={styles.buttonText}>Test SMS</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={updateDeviceStatus}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Refresh Status</Text>
        </TouchableOpacity>
      </View>

      {/* Logs */}
      <View style={styles.section}>
        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>Activity Log</Text>
          <TouchableOpacity onPress={clearLogs}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.logContainer} nestedScrollEnabled>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logEntry}>{log}</Text>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#2196F3',
    marginBottom: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  status: {
    fontWeight: 'bold',
  },
  statusValue: {
    color: '#666',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  secondaryButtonText: {
    color: '#2196F3',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  logContainer: {
    maxHeight: 200,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
  },
  logEntry: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});

export default App;