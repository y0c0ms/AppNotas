# CleanAppNotas Installation Guide

This document provides detailed instructions for installing, using, and maintaining CleanAppNotas on your system.

## Quick Installation (Windows)

1. Navigate to the `releases` directory in this repository
2. Download the installer file `CleanAppNotas-Setup-1.0.0.exe`
3. Run the installer file and follow the on-screen prompts
4. Choose your installation location (default is recommended)
5. Wait for the installation to complete
6. The application will launch automatically when installation is complete

## System Requirements

- Windows 10 or later
- 2GB RAM minimum (4GB recommended)
- 100MB free disk space
- 1280x720 screen resolution or higher

## Usage Tips

- **Minimize to System Tray**: The application will minimize to the system tray when you close the main window. Click the tray icon to restore.
- **Right-Click Menu**: Right-click on the tray icon for quick options like "New Note" or "Exit"
- **Zoom In/Out**: Use Ctrl+ and Ctrl- to adjust text size
- **Dark Mode**: Toggle dark mode from the settings menu or press Ctrl+D

## Building from Source

If you prefer to build the application from source:

1. Ensure you have Node.js v18 or later installed
2. Clone this repository
3. Navigate to the project directory
4. Install dependencies:
   ```
   npm install
   ```
5. Start the application in development mode:
   ```
   npm start
   ```
6. Build the application installer:
   ```
   npm run build
   ```
7. The installer will be created in the `dist` directory

## Uninstallation

CleanAppNotas can be uninstalled in two ways:

1. **Using Windows Control Panel**:
   - Open Control Panel > Programs > Programs and Features
   - Select "CleanAppNotas" from the list
   - Click "Uninstall" and follow the prompts

2. **Using the Uninstaller**:
   - Navigate to the installation directory (typically `C:\Program Files\CleanAppNotas`)
   - Run `uninstall.exe`

## Data Storage

CleanAppNotas stores all note data locally on your machine in the following location:
`%APPDATA%\cleanappnotas\`

To backup your notes, copy this directory to a safe location.

## Troubleshooting

If you encounter any issues with CleanAppNotas:

1. **Application won't start**:
   - Check that you have administrator privileges
   - Verify that your Windows version is compatible

2. **Notes not saving**:
   - Ensure you have write permissions to the %APPDATA% folder
   - Check available disk space

3. **Display issues**:
   - Try toggling between light and dark mode
   - Adjust your system's display scaling

## Support

For additional help or to report bugs, please open an issue in the GitHub repository or contact the developer directly.

---

Thank you for installing CleanAppNotas! We hope it helps you stay organized. 