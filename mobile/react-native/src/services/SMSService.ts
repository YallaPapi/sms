import { NativeModules, Platform } from 'react-native';

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSService {
  private nativeModule: any;

  constructor() {
    this.nativeModule = Platform.OS === 'android' ? NativeModules.SMSManager : null;
  }

  async sendSMS(phoneNumber: string, message: string): Promise<SMSResult> {
    if (!this.nativeModule) {
      return {
        success: false,
        error: 'SMS functionality not available on this platform'
      };
    }

    try {
      // Validate phone number
      const cleanNumber = this.cleanPhoneNumber(phoneNumber);
      if (!this.isValidPhoneNumber(cleanNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      // Validate message
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: 'Message cannot be empty'
        };
      }

      // Send SMS via native module
      const result = await this.nativeModule.sendSMS(cleanNumber, message.trim());
      
      return {
        success: true,
        messageId: result.messageId || `sms_${Date.now()}`
      };
    } catch (error: any) {
      console.error('SMS sending failed:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async canSendSMS(): Promise<boolean> {
    if (!this.nativeModule) {
      return false;
    }

    try {
      const result = await this.nativeModule.canSendSMS();
      return result === true;
    } catch (error) {
      console.error('Failed to check SMS capability:', error);
      return false;
    }
  }

  async getDefaultSMSApp(): Promise<string | null> {
    if (!this.nativeModule) {
      return null;
    }

    try {
      return await this.nativeModule.getDefaultSMSApp();
    } catch (error) {
      console.error('Failed to get default SMS app:', error);
      return null;
    }
  }

  async requestDefaultSMSPermission(): Promise<boolean> {
    if (!this.nativeModule) {
      return false;
    }

    try {
      return await this.nativeModule.requestDefaultSMSPermission();
    } catch (error) {
      console.error('Failed to request default SMS permission:', error);
      return false;
    }
  }

  private cleanPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except + at the beginning
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it starts with +, preserve it
    if (phoneNumber.startsWith('+')) {
      cleaned = '+' + cleaned.substring(1);
    }
    
    return cleaned;
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation
    // Allows international format (+country code) and national format
    const phoneRegex = /^(\+\d{1,3}\d{4,14}|\d{4,15})$/;
    return phoneRegex.test(phoneNumber);
  }

  splitLongMessage(message: string, maxLength: number = 160): string[] {
    if (message.length <= maxLength) {
      return [message];
    }

    const parts: string[] = [];
    for (let i = 0; i < message.length; i += maxLength) {
      parts.push(message.substring(i, i + maxLength));
    }

    return parts;
  }

  async sendLongSMS(phoneNumber: string, message: string): Promise<SMSResult[]> {
    const parts = this.splitLongMessage(message);
    const results: SMSResult[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partMessage = parts.length > 1 ? `(${i + 1}/${parts.length}) ${part}` : part;
      
      const result = await this.sendSMS(phoneNumber, partMessage);
      results.push(result);

      // Add delay between parts to avoid rate limiting
      if (i < parts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}