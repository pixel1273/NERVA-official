# NERVA Android TWA (Trusted Web Activity)

This directory contains the Android Studio project that wraps the NERVA PWA into a native Android APK using [Trusted Web Activity (TWA)](https://developer.chrome.com/docs/android/trusted-web-activity/).

## What is TWA?
A Trusted Web Activity wraps your **deployed** PWA URL into a real `.apk` file. It launches Chrome in full-screen mode (no browser bar) when the domain is verified via Digital Asset Links.

## Prerequisites
- **Android Studio** (latest stable, with Android SDK 29+)
- **JDK 17+**
- **Your NERVA frontend deployed with HTTPS** (e.g., on Vercel, Netlify, or your own server)

## Quick Setup with Bubblewrap

[Bubblewrap](https://github.com/nickvdp/nickvdp-nickvdp) is Google's official CLI for generating TWA projects:

```bash
# Install bubblewrap globally
npm install -g @nickvdp/nickvdp

# OR use npx (no install needed)
npx @nickvdp/nickvdp init --manifest=https://your-domain.com/manifest.webmanifest
```

### Steps:
1. **Deploy the frontend** to a public HTTPS URL
2. Run the bubblewrap init command above (replace `your-domain.com`)
3. It generates the full Android Studio project in this folder
4. Open this folder in Android Studio
5. Build → Generate Signed APK

## Manual Setup (if you prefer)

If you want to set up the project manually instead of using Bubblewrap:

### 1. Create a new Android Studio project
- Template: **Empty Activity**
- Package name: `com.nerva.command`
- Minimum SDK: API 19 (Android 4.4)
- Language: Kotlin

### 2. Add TWA dependencies
In `app/build.gradle`:
```gradle
dependencies {
    implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
}
```

### 3. Configure `AndroidManifest.xml`
Replace the default activity with a TWA launcher:
```xml
<activity android:name="android.support.customtabs.trusted.LauncherActivity">
    <meta-data android:name="android.support.customtabs.trusted.DEFAULT_URL"
               android:value="https://your-domain.com" />
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
        <data android:scheme="https" android:host="your-domain.com"/>
    </intent-filter>
</activity>
```

### 4. Set up Digital Asset Links
Host the `assetlinks.json` file at:
```
https://your-domain.com/.well-known/assetlinks.json
```

## Testing in Android Studio Emulator

1. Open this project in Android Studio
2. Create an AVD: **Pixel 6** with **API 33 (Android 13)**
3. Run the project on the emulator
4. Test these features:
   - ✅ Login flow
   - ✅ GPS capture (emulator supports simulated locations)
   - ✅ Camera/image upload
   - ✅ Offline mode (toggle airplane mode in emulator)
   - ✅ Report submission + offline queue
   - ✅ Install page / sync pending reports

### Testing with local development server:
If your backend is running locally:
1. Start the frontend: `cd frontend && npm run dev -- --host 0.0.0.0`
2. Start the backend: `cd backend && uvicorn app.main:app --host 0.0.0.0`
3. In the emulator, access via `http://10.0.2.2:5173` (special Android emulator IP for host machine)

## Building the APK

```bash
# Debug APK (for testing)
./gradlew assembleDebug

# Release APK (for distribution)
./gradlew assembleRelease
```

The APK will be at: `app/build/outputs/apk/`

## Distribution
- **Sideload**: Share the `.apk` file directly (USB, email, or download link)
- **Play Store**: Upload to a private internal test track
- **Web Download**: Host the APK on the NERVA dashboard `/install` page
