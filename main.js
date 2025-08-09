const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, powerMonitor } = require('electron');
const path = require('path');
const Store = require('electron-store');
const fs = require('fs');

const store = new Store({
  // Ensure data is stored outside the app directory to survive uninstallation
  cwd: path.join(app.getPath('appData'), 'CleanAppNotas-Data')
});

// Keep a global reference of the window and tray objects
let mainWindow = null;
let tray = null;
let isQuitting = false;
let isBackgrounded = false;

// Check for auto start setting
const autoStartEnabled = store.get('autoStartEnabled', false);

// Set up auto start
function configureAutoStart(enabled) {
  if (process.platform === 'win32') {
    const exePath = process.execPath;
    const appFolder = path.dirname(exePath);
    
    try {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        path: exePath,
        args: ['--start-minimized']
      });
      
      // Save setting
      store.set('autoStartEnabled', enabled);
      
      // For packaged app, we need an additional registry approach
      if (app.isPackaged) {
        const { spawn } = require('child_process');
        if (enabled) {
          // Create registry entry for startup
          spawn('reg', [
            'add', 
            'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 
            '/v', 
            'CleanAppNotas', 
            '/t', 
            'REG_SZ', 
            '/d', 
            `"${exePath}" --start-minimized`, 
            '/f'
          ]);
        } else {
          // Remove registry entry
          spawn('reg', [
            'delete', 
            'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', 
            '/v', 
            'CleanAppNotas', 
            '/f'
          ]);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error configuring auto-start:', error);
      return false;
    }
  }
  return false;
}

// Configure auto start on first run or based on stored setting
if (store.get('firstRun', true)) {
  configureAutoStart(true);
  store.set('firstRun', false);
} else {
  configureAutoStart(autoStartEnabled);
}

// Ensure data directory exists and is preserved
function ensureDataDirectory() {
  const dataDir = path.join(app.getPath('appData'), 'CleanAppNotas-Data');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  return dataDir;
}

// Optimize app when running in background
function optimizeForBackground() {
  if (mainWindow && !isBackgrounded) {
    isBackgrounded = true;
    
    // Release memory by clearing cache
    mainWindow.webContents.session.clearCache();
    
    // Reduce CPU usage by limiting frame rate when in background
    mainWindow.webContents.setFrameRate(10);
    
    // Throttle animations
    mainWindow.webContents.executeJavaScript(`
      document.body.classList.add('background-mode');
      // Store current zoom level
      localStorage.setItem('prevZoom', document.documentElement.style.zoom || '1');
      // Lower resolution to save memory
      document.documentElement.style.zoom = '0.5';
    `).catch(e => console.error('Error setting background mode:', e));
  }
}

// Restore optimization when app comes to foreground
function optimizeForForeground() {
  if (mainWindow && isBackgrounded) {
    isBackgrounded = false;
    
    // Restore normal frame rate
    mainWindow.webContents.setFrameRate(60);
    
    // Restore normal UI
    mainWindow.webContents.executeJavaScript(`
      document.body.classList.remove('background-mode');
      // Restore previous zoom level
      const prevZoom = localStorage.getItem('prevZoom') || '1';
      document.documentElement.style.zoom = prevZoom;
    `).catch(e => console.error('Error removing background mode:', e));
  }
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: path.join(__dirname, 'public', 'icon-removebg-preview.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: true, // Enable background throttling
      devTools: !app.isPackaged // Disable DevTools in production
    },
    show: !process.argv.includes('--hidden') && !process.argv.includes('--start-minimized')
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Custom close behavior for Windows (minimize to tray)
  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'win32') {
      event.preventDefault();
      mainWindow.hide();
      optimizeForBackground();
      return false;
    }
  });

  // Performance optimizations
  mainWindow.webContents.on('did-finish-load', () => {
    // Reduce memory usage by clearing cache when app is idle
    setTimeout(() => {
      mainWindow.webContents.session.clearCache();
    }, 30000); // Clear cache after 30 seconds
  });
  
  // Optimize when minimized
  mainWindow.on('minimize', () => {
    optimizeForBackground();
  });
  
  // Restore when brought to focus
  mainWindow.on('restore', () => {
    optimizeForForeground();
  });
  
  mainWindow.on('focus', () => {
    optimizeForForeground();
  });
  
  mainWindow.on('show', () => {
    optimizeForForeground();
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'public', 'icon-removebg-preview.png'));
  
  tray.setToolTip('CleanAppNotas');
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open', 
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { 
      label: 'Start with Windows',
      type: 'checkbox',
      checked: autoStartEnabled,
      click: (menuItem) => {
        const success = configureAutoStart(menuItem.checked);
        if (!success) {
          menuItem.checked = !menuItem.checked; // Revert if failed
          dialog.showMessageBox({
            type: 'error',
            title: 'Auto-start Error',
            message: 'Failed to configure auto-start. Try running the application as administrator.'
          });
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // Show window on tray icon click (Windows behavior)
  tray.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Ensure data directory exists
  ensureDataDirectory();
  
  // Create main window before using its webContents
  createWindow();
  createTray();
  
  // Start minimized if launched with --start-minimized flag
  if (process.argv.includes('--start-minimized')) {
    mainWindow.hide();
    optimizeForBackground();
  }
  
  // Setup system idle/resume monitoring for resource optimization
  powerMonitor.on('suspend', () => {
    // Notify renderer to save all data before system suspends
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript('window.dispatchEvent(new Event("savebeforeclose"));')
        .catch(err => console.error('Error saving before suspend:', err));
    }
    optimizeForBackground();
  });
  
  powerMonitor.on('resume', () => {
    if (mainWindow.isVisible()) {
      optimizeForForeground();
    }
  });
  
  // Also handle shutdown/reboot events
  powerMonitor.on('shutdown', (e) => {
    // Notify renderer to save all data before system shutdown
    if (mainWindow) {
      e.preventDefault();
      mainWindow.webContents.executeJavaScript('window.dispatchEvent(new Event("savebeforeclose"));')
        .then(() => {
          // Allow shutdown to continue after saving is complete
          app.quit();
        })
        .catch(err => {
          console.error('Error saving before shutdown:', err);
          app.quit();
        });
    }
  });
  
  // Monitor system idle time
  const idleThreshold = 5 * 60 * 1000; // 5 minutes
  let idleCheckInterval = setInterval(() => {
    const idleTime = powerMonitor.getSystemIdleTime() * 1000;
    if (idleTime > idleThreshold && !isBackgrounded) {
      optimizeForBackground();
    } else if (idleTime < 10000 && isBackgrounded && mainWindow.isVisible()) {
      // If user is active again and window is visible
      optimizeForForeground();
    }
  }, 60000); // Check every minute
  
  // Prevent multiple instances
  const gotTheLock = app.requestSingleInstanceLock();
  
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      // Someone tried to run a second instance, focus our window instead
      if (mainWindow) {
        if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
          mainWindow.show();
        }
        mainWindow.focus();
      }
    });
  }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create the window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Clean up when app is about to quit
app.on('before-quit', (event) => {
  if (mainWindow) {
    // Tenta salvar notas uma última vez antes de fechar completamente
    try {
      isQuitting = true;
      event.preventDefault();
      
      // Executar script para salvar notas
      mainWindow.webContents.executeJavaScript('window.dispatchEvent(new Event("savebeforeclose"));')
        .then(() => {
          // Adicionar um pequeno atraso para garantir que o salvamento seja concluído
          setTimeout(() => {
            app.exit(0);
          }, 500);
        })
        .catch(err => {
          console.error('Erro ao salvar notas antes de fechar:', err);
          app.exit(0);
        });
    } catch (error) {
      console.error('Erro no evento before-quit:', error);
      app.exit(0);
    }
  }
});

// Handle IPC events from renderer
ipcMain.on('toggle-auto-start', (event, enabled) => {
  const success = configureAutoStart(enabled);
  event.returnValue = success;
}); 