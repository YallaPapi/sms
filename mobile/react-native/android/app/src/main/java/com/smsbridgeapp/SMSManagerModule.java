package com.smsbridgeapp;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.provider.Telephony;
import android.telephony.SmsManager;
import android.telephony.TelephonyManager;
import android.telephony.SignalStrength;
import android.os.BatteryManager;
import android.content.IntentFilter;
import androidx.core.app.ActivityCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.UUID;

public class SMSManagerModule extends ReactContextBaseJavaModule {
    private static final String SMS_SENT = "SMS_SENT";
    private static final String SMS_DELIVERED = "SMS_DELIVERED";
    
    private final ReactApplicationContext reactContext;
    private SmsManager smsManager;
    private TelephonyManager telephonyManager;

    public SMSManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.smsManager = SmsManager.getDefault();
        this.telephonyManager = (TelephonyManager) reactContext.getSystemService(Context.TELEPHONY_SERVICE);
        
        // Register broadcast receivers for SMS status
        registerSMSReceivers();
    }

    @Override
    public String getName() {
        return "SMSManager";
    }

    @ReactMethod
    public void sendSMS(String phoneNumber, String message, Promise promise) {
        try {
            // Check permissions
            if (!hasSMSPermission()) {
                promise.reject("PERMISSION_DENIED", "SMS permission not granted");
                return;
            }

            // Generate unique message ID
            String messageId = UUID.randomUUID().toString();

            // Create pending intents for sent and delivery status
            Intent sentIntent = new Intent(SMS_SENT);
            sentIntent.putExtra("messageId", messageId);
            PendingIntent sentPI = PendingIntent.getBroadcast(reactContext, 0, sentIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            Intent deliverIntent = new Intent(SMS_DELIVERED);
            deliverIntent.putExtra("messageId", messageId);
            PendingIntent deliverPI = PendingIntent.getBroadcast(reactContext, 0, deliverIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            // Check if message is long and needs to be split
            if (message.length() > 160) {
                ArrayList<String> parts = smsManager.divideMessage(message);
                ArrayList<PendingIntent> sentIntents = new ArrayList<>();
                ArrayList<PendingIntent> deliveryIntents = new ArrayList<>();
                
                for (int i = 0; i < parts.size(); i++) {
                    sentIntents.add(sentPI);
                    deliveryIntents.add(deliverPI);
                }
                
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, sentIntents, deliveryIntents);
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, sentPI, deliverPI);
            }

            WritableMap result = Arguments.createMap();
            result.putString("messageId", messageId);
            result.putString("status", "sent");
            result.putString("timestamp", String.valueOf(System.currentTimeMillis()));
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("SMS_SEND_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void canSendSMS(Promise promise) {
        try {
            boolean canSend = hasSMSPermission() && smsManager != null;
            promise.resolve(canSend);
        } catch (Exception e) {
            promise.reject("CHECK_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void getDefaultSMSApp(Promise promise) {
        try {
            String defaultSmsApp = Telephony.Sms.getDefaultSmsPackage(reactContext);
            promise.resolve(defaultSmsApp);
        } catch (Exception e) {
            promise.reject("GET_DEFAULT_APP_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void getPhoneNumber(Promise promise) {
        try {
            if (!hasPhoneStatePermission()) {
                promise.reject("PERMISSION_DENIED", "Phone state permission not granted");
                return;
            }

            String phoneNumber = telephonyManager.getLine1Number();
            if (phoneNumber != null && !phoneNumber.isEmpty()) {
                promise.resolve(phoneNumber);
            } else {
                promise.resolve(null);
            }
        } catch (Exception e) {
            promise.reject("GET_PHONE_NUMBER_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void getSignalStrength(Promise promise) {
        try {
            // Note: Getting signal strength requires special permissions and may not work on all devices
            // This is a simplified implementation
            promise.resolve(75); // Placeholder value
        } catch (Exception e) {
            promise.reject("GET_SIGNAL_STRENGTH_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void getNetworkOperator(Promise promise) {
        try {
            if (!hasPhoneStatePermission()) {
                promise.reject("PERMISSION_DENIED", "Phone state permission not granted");
                return;
            }

            String operator = telephonyManager.getNetworkOperatorName();
            promise.resolve(operator != null ? operator : "Unknown");
        } catch (Exception e) {
            promise.reject("GET_NETWORK_OPERATOR_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void getSimStatus(Promise promise) {
        try {
            if (!hasPhoneStatePermission()) {
                promise.reject("PERMISSION_DENIED", "Phone state permission not granted");
                return;
            }

            int simState = telephonyManager.getSimState();
            String status;
            
            switch (simState) {
                case TelephonyManager.SIM_STATE_READY:
                    status = "ready";
                    break;
                case TelephonyManager.SIM_STATE_ABSENT:
                    status = "no_sim";
                    break;
                case TelephonyManager.SIM_STATE_PIN_REQUIRED:
                case TelephonyManager.SIM_STATE_PUK_REQUIRED:
                    status = "locked";
                    break;
                default:
                    status = "unknown";
                    break;
            }
            
            promise.resolve(status);
        } catch (Exception e) {
            promise.reject("GET_SIM_STATUS_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void getBatteryLevel(Promise promise) {
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = reactContext.registerReceiver(null, ifilter);
            
            int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            
            float batteryPct = level * 100 / (float) scale;
            promise.resolve((int) batteryPct);
        } catch (Exception e) {
            promise.reject("GET_BATTERY_LEVEL_FAILED", e.getMessage());
        }
    }

    private boolean hasSMSPermission() {
        return ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasPhoneStatePermission() {
        return ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED;
    }

    private void registerSMSReceivers() {
        // Register receiver for SMS sent status
        reactContext.registerReceiver(new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String messageId = intent.getStringExtra("messageId");
                
                switch (getResultCode()) {
                    case Activity.RESULT_OK:
                        // SMS sent successfully
                        break;
                    case SmsManager.RESULT_ERROR_GENERIC_FAILURE:
                        // Generic failure
                        break;
                    case SmsManager.RESULT_ERROR_NO_SERVICE:
                        // No service
                        break;
                    case SmsManager.RESULT_ERROR_NULL_PDU:
                        // Null PDU
                        break;
                    case SmsManager.RESULT_ERROR_RADIO_OFF:
                        // Radio off
                        break;
                }
            }
        }, new IntentFilter(SMS_SENT));

        // Register receiver for SMS delivery status
        reactContext.registerReceiver(new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String messageId = intent.getStringExtra("messageId");
                
                switch (getResultCode()) {
                    case Activity.RESULT_OK:
                        // SMS delivered
                        break;
                    case Activity.RESULT_CANCELED:
                        // SMS not delivered
                        break;
                }
            }
        }, new IntentFilter(SMS_DELIVERED));
    }
}