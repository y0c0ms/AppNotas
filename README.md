# CleanAppNotas

A simple, lightweight note-taking app with calendar integration. Create notes, assign dates, and view them in a calendar.

## Features

- Simple and clean UI for note-taking
- Calendar integration (weekly and monthly views)
- Date and time assignment for notes
- Recurring events (weekly)
- Multiple note colors
- Dark mode
- System tray integration
- Auto-start with Windows option
- Low resource usage when running in background

## Installation

### Option 1: Run the installer

1. Download the latest `CleanAppNotas-Setup-1.0.0.exe` from the `dist` folder
2. Run the installer and follow the on-screen instructions
3. The application will start automatically after installation

### Option 2: Build from source

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Build the application: `npm run build`
5. Find the installer in the `dist` folder

## Development

- Start the application in development mode: `npm run dev`
- Package the application without creating an installer: `npm run pack`
- Create the installer: `npm run dist`

## Background Usage Optimization

CleanAppNotas is designed to use minimal system resources when running in the background:

- Animation and transitions are disabled when minimized or hidden
- Reduced frame rate and lower resolution in background mode
- Auto memory cleanup during idle time
- Cache clearing to reduce memory footprint

## Uninstallation

The app can be uninstalled in two ways:
1. From Windows Control Panel > Programs > Uninstall a Program
2. From the installation directory, run `uninstall.exe`

## License

This project is licensed under the ISC License - see the LICENSE file for details. 