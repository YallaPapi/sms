# SMS Bridge React Native App Setup Instructions

## Prerequisites

1. **Node.js** (16 or later)
2. **React Native CLI** (`npm install -g react-native-cli`)
3. **Android Studio** with Android SDK
4. **JDK 11** or later
5. **Android device** with USB debugging enabled OR Android emulator

## Setup Steps

### 1. Initialize React Native Project

```bash
cd mobile/react-native
npx react-native init SMSBridgeApp --template react-native-template-typescript
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Android Setup

#### Add Permissions to AndroidManifest.xml

Add these permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.SEND_SMS" />
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

#### Register Native Module

Add to `MainApplication.java`:

```java
import com.smsbridgeapp.SMSManagerPackage;

@Override
protected List<ReactPackage> getPackages() {
    @SuppressWarnings("UnnecessaryLocalVariable")
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new SMSManagerPackage());  // Add this line
    return packages;
}
```

### 4. Build and Install

#### Debug Build

```bash
npx react-native run-android
```

#### Release Build

```bash
cd android
./gradlew assembleRelease
```

The APK will be generated in `android/app/build/outputs/apk/release/app-release.apk`

### 5. Device Configuration

#### USB Connection Setup

1. Enable **Developer Options** on your Android device
2. Enable **USB Debugging**
3. Connect device via USB
4. Accept USB debugging authorization
5. Verify connection: `adb devices`

#### WiFi Connection Setup

1. Install the SMS Bridge app on your Android device
2. Connect device to the same network as your SMS platform server
3. Open the app and configure:
   - **Server URL**: `http://[SERVER_IP]:4000`
   - **Device Name**: Any descriptive name
4. Enable the bridge service

## App Configuration

### First Run Setup

1. **Grant Permissions**: The app will request SMS and phone permissions
2. **Set Server URL**: Enter your SMS platform server address
3. **Set Device Name**: Choose a recognizable name for this device
4. **Enable Bridge**: Toggle the switch to start the bridge service

### Server Connection

The app connects to your SMS platform server via:

- **WebSocket** (primary): For real-time communication
- **HTTP REST API** (fallback): For batch operations and status updates

### Features

- **Real-time SMS sending** via server commands
- **Device status monitoring** (battery, signal, SIM status)
- **Automatic reconnection** if server connection is lost
- **Activity logging** for debugging and monitoring
- **Test SMS functionality** for verification

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure all required permissions are granted in Android settings
   - Check that USB debugging is enabled

2. **SMS Sending Failed**
   - Verify SIM card is installed and active
   - Check that the app is set as the default SMS app (if required)
   - Ensure device has cellular network coverage

3. **Server Connection Failed**
   - Verify server URL is correct and accessible
   - Check network connectivity
   - Ensure server is running and accepting connections

4. **ADB Device Not Found**
   - Install proper USB drivers for your device
   - Try different USB cables/ports
   - Restart ADB: `adb kill-server && adb start-server`

### Debug Commands

```bash
# Check connected devices
adb devices

# View app logs
adb logcat | grep SMSBridge

# Install APK manually
adb install android/app/build/outputs/apk/release/app-release.apk

# Forward port for debugging
adb reverse tcp:4000 tcp:4000
```

## Production Deployment

### Building Release APK

1. Generate signing key:
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Configure signing in `android/app/build.gradle`

3. Build release:
```bash
cd android && ./gradlew assembleRelease
```

### Distribution

- **Direct Installation**: Transfer APK to devices and install
- **Internal Distribution**: Use tools like Firebase App Distribution
- **Google Play Store**: Follow standard Android publishing process

## Integration with SMS Platform

The React Native app works as a bridge between your SMS platform server and physical Android devices:

1. **Device Registration**: App registers with server on startup
2. **Command Processing**: Server sends SMS commands via WebSocket
3. **Status Reporting**: App sends device status updates to server
4. **Message Logging**: All SMS activities are logged to server database

This enables your web dashboard to control multiple physical Android devices for SMS sending campaigns.