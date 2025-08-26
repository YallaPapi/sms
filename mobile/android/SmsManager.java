package com.smsplatform.bridge;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.BatteryManager;
import android.telephony.SmsManager;
import android.telephony.TelephonyManager;
import android.telephony.SignalStrength;
import androidx.core.app.ActivityCompat;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.HashMap;
import java.util.Map;

public class SmsManagerModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "SmsManagerModule";
    private final ReactApplicationContext reactContext;
    private TelephonyManager telephonyManager;
    private BatteryManager batteryManager;

    public SmsManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.telephonyManager = (TelephonyManager) reactContext.getSystemService(Context.TELEPHONY_SERVICE);
        this.batteryManager = (BatteryManager) reactContext.getSystemService(Context.BATTERY_SERVICE);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void sendSMS(String phoneNumber, String message, String campaignId, Promise promise) {
        try {
            // Check SMS permission
            if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.SEND_SMS) 
                != PackageManager.PERMISSION_GRANTED) {
                promise.reject("PERMISSION_DENIED", "SMS permission not granted");
                return;
            }

            SmsManager smsManager = SmsManager.getDefault();
            
            // Split long messages if necessary
            if (message.length() > 160) {
                ArrayList<String> parts = smsManager.divideMessage(message);
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null);
            }

            // Create response object
            WritableMap response = Arguments.createMap();
            response.putString("messageId", campaignId + "_" + System.currentTimeMillis());
            response.putString("status", "sent");
            response.putString("phoneNumber", phoneNumber);
            response.putDouble("timestamp", System.currentTimeMillis());

            // Send success event
            sendEvent("smsSent", response);
            promise.resolve(response);

        } catch (Exception e) {
            WritableMap errorResponse = Arguments.createMap();
            errorResponse.putString("error", e.getMessage());
            errorResponse.putString("phoneNumber", phoneNumber);
            
            sendEvent("smsError", errorResponse);
            promise.reject("SMS_SEND_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void getDeviceStatus(Promise promise) {
        try {
            WritableMap status = Arguments.createMap();
            
            // Battery level
            int batteryLevel = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
            status.putInt("battery", batteryLevel);

            // Signal strength (requires phone permission)
            if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_COARSE_LOCATION) 
                == PackageManager.PERMISSION_GRANTED) {
                
                // Get signal strength - this is a simplified version
                // In practice, you'd need to register a listener for signal strength updates
                status.putInt("signal", getSignalStrength());
            } else {
                status.putInt("signal", -1); // Unknown
            }

            // SIM card status
            int simState = telephonyManager.getSimState();
            String simStatus = "error";
            switch (simState) {
                case TelephonyManager.SIM_STATE_READY:
                    simStatus = "ready";
                    break;
                case TelephonyManager.SIM_STATE_ABSENT:
                    simStatus = "no_sim";
                    break;
                case TelephonyManager.SIM_STATE_PIN_REQUIRED:
                case TelephonyManager.SIM_STATE_PUK_REQUIRED:
                    simStatus = "pin_required";
                    break;
                default:
                    simStatus = "error";
                    break;
            }
            status.putString("simStatus", simStatus);

            // Network operator
            String networkOperator = telephonyManager.getNetworkOperatorName();
            status.putString("networkOperator", networkOperator);

            // Device info
            status.putString("deviceId", telephonyManager.getDeviceId());
            status.putString("phoneNumber", telephonyManager.getLine1Number());
            status.putDouble("timestamp", System.currentTimeMillis());

            promise.resolve(status);

        } catch (Exception e) {
            promise.reject("STATUS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestPermissions(Promise promise) {
        try {
            // This would typically be handled by the main activity
            // Here we just check if permissions are granted
            
            boolean smsPermission = ActivityCompat.checkSelfPermission(reactContext, 
                Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
            
            boolean phonePermission = ActivityCompat.checkSelfPermission(reactContext, 
                Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED;

            WritableMap permissions = Arguments.createMap();
            permissions.putBoolean("sms", smsPermission);
            permissions.putBoolean("phone", phonePermission);
            
            promise.resolve(permissions);

        } catch (Exception e) {
            promise.reject("PERMISSION_ERROR", e.getMessage());
        }
    }

    private int getSignalStrength() {
        // This is a simplified implementation
        // In practice, you'd need to use SignalStrength callbacks
        // or register a PhoneStateListener
        
        // Return a placeholder value for now
        return 75; // Represents signal strength percentage
    }

    private void sendEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    // Constants for JavaScript
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("MODULE_NAME", MODULE_NAME);
        return constants;
    }
}