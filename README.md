# GPX Go! 🗺️

A mobile-friendly Progressive Web App (PWA) for viewing and tracking GPX files with advanced location features.

## Features

- 📱 **Mobile-First Design**: Optimized for mobile devices with touch-friendly controls
- 🗺️ **GPX File Viewer**: Load and visualize GPX tracks and waypoints
- 📍 **Live Location Tracking**: Follow your current position on the map
- 🧭 **Compass & Speed Display**: Real-time heading and speed information
- 💾 **Persistent Storage**: Your GPX files are automatically saved in localStorage
- ⚡ **Offline Capable**: Works offline with service worker caching

## Data Persistence Solutions

This app implements several improvements to prevent data loss during app updates:

### 1. Service Worker Caching
- Implements a service worker for offline functionality
- Properly manages cache updates without affecting localStorage
- Ensures app resources are cached separately from user data

### 2. Improved Caching Headers
- Optimized Firebase Hosting configuration
- Separate cache policies for different file types
- Service worker gets fresh updates while preserving user data

### 3. Removed Aggressive Cache Headers
- Removed problematic cache control meta tags from HTML
- Prevents browsers from clearing localStorage during updates

## How Data Loss Was Prevented

The previous data loss issue occurred due to:
1. **Aggressive cache control headers** causing browser to clear localStorage
2. **No service worker** to properly manage caching
3. **Hard refresh behavior** when new versions were deployed

### Solutions Implemented:

1. **Removed aggressive cache headers** from HTML
2. **Added service worker** with proper cache management
3. **Added Firebase Hosting headers** with optimized caching policies

## Adding to Home Screen

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button (square with arrow up)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen" or "Install App"
4. Confirm the installation

## Usage

### Loading GPX Files
1. Click "Load GPX" button
2. Select from previously loaded files or upload new ones
3. Files are automatically saved to localStorage

### Following Your Location
1. Click "Follow Me" to start location tracking
2. Map will center on your current position
3. Compass shows your heading direction
4. Speed display shows current movement speed

## Technical Implementation

- **Frontend**: Vanilla JavaScript with modular architecture
- **Mapping**: Leaflet.js with OpenStreetMap tiles
- **Storage**: localStorage for persistent data
- **PWA**: Service worker for offline functionality and proper caching
- **Hosting**: Firebase Hosting with optimized cache policies

## File Structure

```
├── index.html          # Main application file
├── app.js             # Main application logic
├── sw.js              # Service worker for caching and offline support
├── styles.css         # Application styling
├── manifest.json      # PWA manifest
├── firebase.json      # Firebase hosting configuration
└── modules/
    ├── storage.js         # localStorage management
    ├── gpxProcessor.js    # GPX file processing
    ├── locationTracker.js # GPS location tracking
    ├── markers.js         # Map marker management
    ├── uiController.js    # User interface management
    ├── pointFilter.js     # Waypoint filtering logic
    ├── coordinates.js     # Coordinate transformations
    └── config.js          # Application configuration
```

## Development

### Setting Up Icons
Generate optimized PWA icons from your favicon.png:

```bash
# Option 1: Using npm script
npm run generate-icons

# Option 2: Using batch file
generate-icons.bat

# Option 3: Using Node.js directly
node generate-icons.js
```

This will:
- 📦 Generate 8 different icon sizes (72x72 to 512x512)
- 💾 Save all icons in the `assets/` folder
- ✏️ Update `manifest.json` with proper icon paths and purposes
- 🔧 Update `firebase.json` to include assets in deployment

### Running Locally
```bash
# Option 1: Use the dev script
dev.bat

# Option 2: Manual server start
python -m http.server 8000

# Option 3: Using Node.js
npx serve .
```

## Deployment

### Automatic Deployment (Recommended)
The project includes scripts that automatically increment the service worker cache version and deploy:

```bash
# Option 1: Using Node.js (requires Node.js installed)
node deploy.js

# Option 2: Using the batch file
deploy.bat

# Option 3: Using PowerShell
powershell -ExecutionPolicy Bypass -File deploy.ps1

# Option 4: Using npm script (if you have Node.js)
npm run deploy
```

### Manual Deployment
If you prefer to deploy manually:

1. **Update cache version** in `sw.js`:
   ```javascript
   const CACHE_NAME = "gpx-go-v2"; // Increment the number
   ```

2. **Deploy to Firebase**:
   ```bash
   firebase deploy
   ```

### How Automatic Deployment Works

The deployment script:
1. 📦 Reads the current cache version from `sw.js`
2. 🔢 Automatically increments the version number (v1 → v2 → v3, etc.)
3. ✏️ Updates the `CACHE_NAME` in the service worker
4. 🚀 Runs `firebase deploy`
5. 🎉 Users get the new version automatically

### User Update Process

When you deploy a new version:
- **Service worker** detects the new version automatically
- **Cached content** is updated in the background
- **Users get updates** on next app launch/refresh
- **No data loss** - localStorage persists across updates

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support  
- Safari: Full support (iOS 14.3+)
- All modern mobile browsers

## Data Privacy

- All data is stored locally on your device
- No data is sent to external servers
- GPS location is only used locally for mapping
- GPX files remain on your device only
