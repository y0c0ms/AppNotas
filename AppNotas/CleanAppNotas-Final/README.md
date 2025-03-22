# CleanAppNotas

CleanAppNotas is a lightweight note-taking application designed for efficiency and ease of use. It features calendar integration, customizable note categories, and a minimalist interface optimized for both productivity and low system resource usage.

![CleanAppNotas Screenshot](public/favicon.png)

## Features

- **Simple Note Management**: Create, edit, and delete notes with a clean interface
- **Calendar Integration**: View notes by day, week, or month in an integrated calendar
- **Color Categories**: Organize notes with customizable color coding
- **Dark/Light Mode**: Toggle between themes based on your preference
- **System Tray Integration**: Minimize to tray for quick access without cluttering your taskbar
- **Lightweight**: Optimized for performance with minimal resource usage
- **Offline First**: All data is stored locally - no internet connection required

## Quick Installation

1. Download the installer from the `releases` directory
2. Run `CleanAppNotas-Setup-1.0.0.exe`
3. Follow the installation prompts
4. Launch the application from your desktop or start menu

For detailed installation instructions, please see [INSTALL.md](INSTALL.md).

## Usage Tips

- **Create a new note**: Click the "+" button
- **Edit a note**: Click on any note to edit its content
- **Delete a note**: Click the trash icon on any note
- **Set a date**: Click the calendar icon to add a date to a note
- **Calendar view**: Click "Calendar" in the sidebar to view notes by date
- **Minimize to tray**: Click the tray icon or close the window to minimize to system tray
- **Dark mode**: Toggle in settings or press Ctrl+D

## Development

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run in development mode:
   ```
   npm start
   ```

### Building

To create an installer:

```
npm run build
```

The installer will be available in the `dist` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with Electron
- Uses Moment.js for date handling
- Interface inspired by minimalist design principles

---

For technical support or questions, please open an issue in the repository. 