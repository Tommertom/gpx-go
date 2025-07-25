"# GPX Go!

A mobile-friendly Progressive Web App (PWA) for viewing GPX files with follow mode.

## Features

- 📱 Mobile-optimized interface
- 🗺️ Interactive GPX file viewing
- 📍 GPS location tracking with follow mode
- 🧭 Compass-based orientation (on supported devices)
- 💾 Automatic GPX file saving to localStorage
- 🎯 Waypoint filtering based on proximity to route

## Adding to Home Screen

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button (square with arrow up)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm
5. The app will appear as "GPX Go!" with a green icon

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen" or "Install App"
4. Confirm the installation

## Installation

Simply serve the files from a web server. All dependencies are loaded from CDNs.

## Files

- `index.html` - Main application
- `manifest.json` - PWA manifest
- `fk.json` - Points of interest data
- `icon-generator.html` - Tool for creating custom icons

## Icon Customization

The app uses SVG-based icons with a green GPS/route theme. To create custom PNG icons:

1. Open `icon-generator.html` in your browser
2. Follow the instructions to convert the SVG to PNG format
3. Create files: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
4. Update the manifest.json to reference PNG files instead of SVG data URLs" 
