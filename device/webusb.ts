
import { Device, DeviceStatus } from '../backend/src/services/deviceService';

export interface USBDeviceInfo {
  vendorId: number;
  productId: number;
  deviceName: string;
  serialNumber?: string;
}

export class WebUSBSMS implements Device {
  public id: string;
  public name: string;
  public type: 'android' | 'ios' | 'usb_modem' = 'usb_modem';
  public status: 'online' | 'offline' | 'busy' | 'error' = 'offline';
  public connection: 'usb' = 'usb';
  public battery?: number;
  public signal?: number;
  public simStatus?: 'ready' | 'no_sim' | 'pin_required' | 'error';
  public lastSeen: Date = new Date();
  public messageQueue: number = 0;

  private device: USBDevice | null = null;
  private deviceInfo: USBDeviceInfo | null = null;

  constructor(deviceId: string, deviceName: string) {
    this.id = deviceId;
    this.name = deviceName;
  }

  async connectDevice(filters: USBDeviceRequestOptions = { filters: [] }): Promise<boolean> {
    try {
      // Check if WebUSB is supported
      if (!navigator.usb) {
        throw new Error('WebUSB is not supported in this browser');
      }

      // Request device from user
      this.device = await navigator.usb.requestDevice(filters);
      
      if (!this.device) {
        throw new Error('No device selected');
      }

      // Store device information
      this.deviceInfo = {
        vendorId: this.device.vendorId,
        productId: this.device.productId,
        deviceName: this.device.productName || 'Unknown USB Device',
        serialNumber: this.device.serialNumber
      };

      // Open device connection
      await this.device.open();

      // Try to claim interface (usually interface 0 for CDC devices)
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }

      // Claim the interface for communication
      await this.device.claimInterface(0);

      this.status = 'online';
      this.lastSeen = new Date();
      
      // Initialize device communication
      await this.initializeDevice();
      
      return true;
    } catch (error) {
      console.error('USB device connection failed:', error);
      this.status = 'error';
      return false;
    }
  }

  async sendSMS(options: {
    to: string;
    message: string;
    campaignId?: string;
  }): Promise<{
    messageId: string;
    status: 'sent' | 'pending' | 'failed';
  }> {
    if (!this.device) {
      throw new Error('No USB device connected');
    }
    
    try {
      this.status = 'busy';
      this.messageQueue++;

      // Send AT commands for SMS
      // This is a simplified SMS modem implementation using AT commands
      await this.sendATCommand('AT'); // Check if device is ready
      await this.sendATCommand('AT+CMGF=1'); // Set SMS text mode
      await this.sendATCommand(`AT+CMGS="${options.to}"`); // Set recipient
      await this.sendATCommand(options.message + '\x1A'); // Send message with Ctrl+Z

      this.status = 'online';
      this.messageQueue--;
      this.lastSeen = new Date();
      
      return {
        messageId: `usb_${this.id}_${Date.now()}`,
        status: 'sent'
      };
      
    } catch (error) {
      this.status = 'error';
      this.messageQueue--;
      throw new Error(`USB SMS sending failed: ${error}`);
    }
  }

  async getStatus(): Promise<DeviceStatus> {
    if (!this.device) {
      throw new Error('No USB device connected');
    }

    try {
      // Query device status using AT commands
      const signalResponse = await this.sendATCommand('AT+CSQ'); // Signal quality
      const batteryResponse = await this.sendATCommand('AT+CBC'); // Battery charge
      const simResponse = await this.sendATCommand('AT+CPIN?'); // SIM status

      // Parse responses (simplified)
      this.signal = this.parseSignalQuality(signalResponse);
      this.battery = this.parseBatteryLevel(batteryResponse);
      this.simStatus = this.parseSimStatus(simResponse);

      return {
        battery: this.battery || 0,
        signal: this.signal || 0,
        simStatus: this.simStatus || 'error',
        queueLength: this.messageQueue
      };
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.device) {
        await this.device.releaseInterface(0);
        await this.device.close();
        this.device = null;
      }
      this.status = 'offline';
    } catch (error) {
      console.error('USB device disconnect error:', error);
    }
  }

  private async initializeDevice(): Promise<void> {
    try {
      // Initialize SMS modem with basic AT commands
      await this.sendATCommand('ATZ'); // Reset modem
      await this.sendATCommand('ATE0'); // Turn off echo
      await this.sendATCommand('AT+CMGF=1'); // Set SMS text mode
      await this.sendATCommand('AT+CNMI=1,2,0,1,0'); // SMS notification settings
    } catch (error) {
      throw new Error(`Device initialization failed: ${error}`);
    }
  }

  private async sendATCommand(command: string): Promise<string> {
    if (!this.device) {
      throw new Error('No USB device connected');
    }

    try {
      // Prepare command with CR+LF termination
      const fullCommand = command + '\r\n';
      const encoder = new TextEncoder();
      const data = encoder.encode(fullCommand);

      // Send command to device (endpoint 1 for output)
      await this.device.transferOut(1, data);

      // Read response from device (endpoint 1 for input)
      const response = await this.device.transferIn(1, 256);
      
      if (response.data) {
        const decoder = new TextDecoder();
        return decoder.decode(response.data);
      }

      return '';
    } catch (error) {
      throw new Error(`AT command failed: ${error}`);
    }
  }

  private parseSignalQuality(response: string): number {
    // Parse AT+CSQ response: +CSQ: <rssi>,<ber>
    const match = response.match(/\+CSQ:\s*(\d+),\d+/);
    if (match) {
      const rssi = parseInt(match[1]);
      // Convert RSSI to percentage (0-31 range to 0-100%)
      return Math.round((rssi / 31) * 100);
    }
    return 0;
  }

  private parseBatteryLevel(response: string): number {
    // Parse AT+CBC response: +CBC: <bcs>,<bcl>,<voltage>
    const match = response.match(/\+CBC:\s*\d+,(\d+),\d+/);
    if (match) {
      return parseInt(match[1]); // Battery level percentage
    }
    return 0;
  }

  private parseSimStatus(response: string): 'ready' | 'no_sim' | 'pin_required' | 'error' {
    if (response.includes('+CPIN: READY')) {
      return 'ready';
    } else if (response.includes('+CPIN: SIM PIN')) {
      return 'pin_required';
    } else if (response.includes('ERROR') || response.includes('NO SIM')) {
      return 'no_sim';
    }
    return 'error';
  }

  // Static method to detect USB SMS modems
  static async detectUSBModems(): Promise<USBDevice[]> {
    try {
      if (!navigator.usb) {
        throw new Error('WebUSB not supported');
      }

      // Get list of connected USB devices
      const devices = await navigator.usb.getDevices();
      
      // Filter for known SMS modem vendor/product IDs
      const smsModems = devices.filter(device => {
        // Common SMS modem vendor IDs
        const knownVendors = [
          0x12D1, // Huawei
          0x19D2, // ZTE
          0x1BBB, // T & A Mobile Phones
          0x0E8D, // MediaTek
          0x2001, // D-Link
          0x05C6, // Qualcomm
        ];
        
        return knownVendors.includes(device.vendorId);
      });

      return smsModems;
    } catch (error) {
      console.error('USB modem detection failed:', error);
      return [];
    }
  }
}

// Export factory function for creating WebUSB SMS instances
export async function createWebUSBSMS(deviceId?: string): Promise<WebUSBSMS | null> {
  try {
    const instance = new WebUSBSMS(
      deviceId || `usb_${Date.now()}`,
      'USB SMS Modem'
    );

    const connected = await instance.connectDevice({
      filters: [
        // SMS modem device filters
        { vendorId: 0x12D1 }, // Huawei
        { vendorId: 0x19D2 }, // ZTE
        { vendorId: 0x1BBB }, // T & A Mobile Phones
        { vendorId: 0x0E8D }, // MediaTek
      ]
    });

    return connected ? instance : null;
  } catch (error) {
    console.error('Failed to create WebUSB SMS instance:', error);
    return null;
  }
}
