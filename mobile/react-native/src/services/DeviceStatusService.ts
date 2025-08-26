import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

interface DeviceStatus {
  battery: number;
  signalStrength: number;
  simStatus: 'ready' | 'no_sim' | 'locked' | 'unknown';
  phoneNumber?: string;
  networkOperator?: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
}

export class DeviceStatusService {
  private lastUpdate: Date = new Date(0);
  private cachedStatus: DeviceStatus | null = null;
  private updateInterval: number = 10000; // Cache for 10 seconds

  async getDeviceStatus(): Promise<DeviceStatus> {
    const now = new Date();
    const timeSinceUpdate = now.getTime() - this.lastUpdate.getTime();

    // Return cached status if recent
    if (this.cachedStatus && timeSinceUpdate < this.updateInterval) {
      return this.cachedStatus;
    }

    // Update status
    const status = await this.updateDeviceStatus();
    this.cachedStatus = status;
    this.lastUpdate = now;

    return status;
  }

  private async updateDeviceStatus(): Promise<DeviceStatus> {
    try {
      const [
        battery,
        signalStrength,
        simStatus,
        phoneNumber,
        networkOperator,
        deviceModel,
        osVersion,
        appVersion
      ] = await Promise.all([
        this.getBatteryLevel(),
        this.getSignalStrength(),
        this.getSimStatus(),
        this.getPhoneNumber(),
        this.getNetworkOperator(),
        DeviceInfo.getModel(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getVersion()
      ]);

      return {
        battery,
        signalStrength,
        simStatus,
        phoneNumber,
        networkOperator,
        deviceModel,
        osVersion,
        appVersion
      };
    } catch (error) {
      console.error('Failed to update device status:', error);
      
      // Return default status on error
      return {
        battery: 0,
        signalStrength: 0,
        simStatus: 'unknown',
        deviceModel: await DeviceInfo.getModel(),
        osVersion: await DeviceInfo.getSystemVersion(),
        appVersion: await DeviceInfo.getVersion()
      };
    }
  }

  private async getBatteryLevel(): Promise<number> {
    try {
      const batteryLevel = await DeviceInfo.getBatteryLevel();
      return Math.round(batteryLevel * 100);
    } catch (error) {
      console.error('Failed to get battery level:', error);
      return 0;
    }
  }

  private async getSignalStrength(): Promise<number> {
    // React Native doesn't have direct API for signal strength
    // This would typically be implemented via native modules
    try {
      if (Platform.OS === 'android') {
        // Would require native Android module to get actual signal strength
        // For now, return a placeholder value
        return 75; // Placeholder
      }
      return 0;
    } catch (error) {
      console.error('Failed to get signal strength:', error);
      return 0;
    }
  }

  private async getSimStatus(): Promise<'ready' | 'no_sim' | 'locked' | 'unknown'> {
    try {
      // This would typically require native modules to check SIM status
      // For now, we'll use a heuristic based on phone number availability
      const phoneNumber = await this.getPhoneNumber();
      
      if (phoneNumber && phoneNumber.length > 0) {
        return 'ready';
      }
      
      // Additional checks could be implemented via native modules
      return 'unknown';
    } catch (error) {
      console.error('Failed to get SIM status:', error);
      return 'unknown';
    }
  }

  private async getPhoneNumber(): Promise<string | undefined> {
    try {
      const phoneNumber = await DeviceInfo.getPhoneNumber();
      
      // DeviceInfo.getPhoneNumber() may return null or empty string
      if (phoneNumber && phoneNumber.length > 0 && phoneNumber !== 'unknown') {
        return phoneNumber;
      }
      
      return undefined;
    } catch (error) {
      console.error('Failed to get phone number:', error);
      return undefined;
    }
  }

  private async getNetworkOperator(): Promise<string | undefined> {
    try {
      const carrier = await DeviceInfo.getCarrier();
      
      if (carrier && carrier.length > 0 && carrier !== 'unknown') {
        return carrier;
      }
      
      return undefined;
    } catch (error) {
      console.error('Failed to get network operator:', error);
      return undefined;
    }
  }

  async isNetworkAvailable(): Promise<boolean> {
    try {
      // Check if device has network connectivity
      const netInfo = await DeviceInfo.getNetworkConnectionInfo();
      return netInfo && netInfo.connectionType !== 'none';
    } catch (error) {
      console.error('Failed to check network availability:', error);
      return false;
    }
  }

  async getDeviceInfo(): Promise<{
    deviceId: string;
    deviceName: string;
    brand: string;
    model: string;
    osVersion: string;
    appVersion: string;
  }> {
    try {
      const [deviceId, deviceName, brand, model, osVersion, appVersion] = await Promise.all([
        DeviceInfo.getUniqueId(),
        DeviceInfo.getDeviceName(),
        DeviceInfo.getBrand(),
        DeviceInfo.getModel(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getVersion()
      ]);

      return {
        deviceId,
        deviceName,
        brand,
        model,
        osVersion,
        appVersion
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      throw error;
    }
  }

  // Storage and memory info
  async getStorageInfo(): Promise<{
    totalStorage: number;
    freeStorage: number;
    totalMemory: number;
    usedMemory: number;
  }> {
    try {
      const [totalStorage, freeStorage, totalMemory, usedMemory] = await Promise.all([
        DeviceInfo.getTotalDiskCapacity(),
        DeviceInfo.getFreeDiskStorage(),
        DeviceInfo.getTotalMemory(),
        DeviceInfo.getUsedMemory()
      ]);

      return {
        totalStorage,
        freeStorage,
        totalMemory,
        usedMemory
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        totalStorage: 0,
        freeStorage: 0,
        totalMemory: 0,
        usedMemory: 0
      };
    }
  }

  // Clear cached status to force refresh
  clearCache(): void {
    this.cachedStatus = null;
    this.lastUpdate = new Date(0);
  }

  // Set update interval for caching
  setUpdateInterval(intervalMs: number): void {
    this.updateInterval = intervalMs;
  }
}