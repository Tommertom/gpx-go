# GPX Go! - Modular Structure

This project has been refactored into a modular architecture for better maintainability, readability, and scalability.

## Project Structure

```
├── app.js                     # Main application entry point
├── modules/
│   ├── config.js             # Configuration constants
│   ├── coordinates.js        # Coordinate conversion utilities
│   ├── storage.js            # localStorage management
│   ├── markers.js            # Marker creation and management
│   ├── pointFilter.js        # Proximity filtering logic
│   ├── uiController.js       # UI interactions and status updates
│   ├── locationTracker.js    # Geolocation and compass functionality
│   └── gpxProcessor.js       # GPX parsing and processing
├── script.js                 # DEPRECATED - see script.js.backup
├── script.js.backup          # Original monolithic code
└── index.html                # Updated to use modular structure
```

## Modules Overview

### 1. **app.js** - Main Application
- Orchestrates all modules
- Initializes the map and modules
- Handles main application flow
- Sets up event listeners

### 2. **config.js** - Configuration
- All application constants
- Map settings, coordinate system definitions
- Storage keys, proximity settings
- Easy to modify without touching other code

### 3. **coordinates.js** - Coordinate Conversion
- Handles proj4 coordinate transformations
- Converts between different coordinate systems (RD, WGS84, Web Mercator)
- Distance calculations between points

### 4. **storage.js** - localStorage Management
- GPX file storage and retrieval
- Waypoint caching
- Storage cleanup utilities
- Centralized storage key management

### 5. **markers.js** - Marker Factory
- Creates all types of markers (waypoints, numbered points, arrows)
- Manages marker collections
- Handles marker styling and interactions

### 6. **pointFilter.js** - Proximity Filtering
- Filters JSON points by proximity to GPX tracks
- Removes duplicate points within minimum separation
- Optimizes point selection for display

### 7. **uiController.js** - UI Management
- Button state management
- Status message display
- Compass display updates
- Event listener setup

### 8. **locationTracker.js** - Geolocation & Compass
- GPS location tracking
- Follow mode functionality
- Device orientation/compass handling
- Location-based map centering

### 9. **gpxProcessor.js** - GPX Processing
- GPX file parsing and validation
- Fallback visualization creation
- Track point and waypoint extraction
- Integration with other modules for complete GPX handling

## Benefits of Modular Structure

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Maintainability**: Easier to locate and fix bugs in specific functionality
3. **Reusability**: Modules can be reused or replaced independently
4. **Testability**: Each module can be unit tested in isolation
5. **Scalability**: Easy to add new features without affecting existing code
6. **Readability**: Smaller, focused files are easier to understand

## Migration Notes

- The original `script.js` has been backed up to `script.js.backup`
- HTML file updated to load `app.js` as a module
- All functionality preserved with the same external behavior
- Global variables and functions have been encapsulated within appropriate modules

## Usage

The application works exactly the same as before, but now with a clean, modular architecture. Simply open `index.html` in a web browser - the new modular system will load automatically.

## Development

To modify specific functionality:
- **Map configuration**: Edit `modules/config.js`
- **Storage behavior**: Edit `modules/storage.js`
- **Marker appearance**: Edit `modules/markers.js`
- **GPX processing**: Edit `modules/gpxProcessor.js`
- **UI interactions**: Edit `modules/uiController.js`
- **Location features**: Edit `modules/locationTracker.js`

Each module exports classes or functions that can be imported and used by other modules, maintaining clean dependencies and interfaces.
