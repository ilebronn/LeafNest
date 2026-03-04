# LeafNest

LeafNest is a React Native + Expo app for identifying plant species from photos, tracking scans, and exploring community trends. It uses Firebase for authentication, data, and storage, and supports location-aware identification to improve results.

**Features**
- Photo-based species identification (camera and gallery).
- Scan history and favorites.
- Community feed with trending species.
- Badges and scan stats.
- Notifications and weekly scan reports.
- Guest mode with limited scans and premium upgrade for unlimited scans.

**Tech Stack**
- React Native, Expo (New Architecture enabled).
- Firebase (Auth, Firestore, Storage).
- React Navigation.
- i18next for localization.
- Expo Camera, Image Picker, Location, Notifications.

**Getting Started**
1. Install dependencies.
2. Configure environment variables and Firebase.
3. Run the app with Expo.

```bash
npm install
npm run start
```

**Scripts**
- `npm run start` - Start Expo dev server.
- `npm run android` - Run on Android device/emulator.
- `npm run ios` - Run on iOS simulator (macOS).
- `npm run web` - Run on web.
- `npm run i18n:translate -- --provider=google` - translator


**Configuration**
- Environment variables live in `.env` (do not commit secrets).
- Android Firebase config uses `google-services.json` in the project root.
- App config is in `app.json`.

**Project Structure**
- `src/` - App source code.
- `src/screens/` - Screens and navigation flows.
- `src/services/` - Firebase, API, and subscription services.
- `src/components/` - Reusable UI components.
- `src/utils/` - Utilities and helpers.

**Notes**
- Permissions: camera, storage, and location are required for scanning and location-aware identification.
- This repo includes Firebase rules and indexes under the root.

**License**
0BSD
