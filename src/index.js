const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('node:path');
const rpc = require('discord-rpc');

const clientId = '1279802287757201451';
rpc.register(clientId);
const client = new rpc.Client({ transport: 'ipc' });

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1080,
    height: 700,
    title: '카트플러그',
    icon: path.join(__dirname, 'icon.png'),
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  client.login({ clientId }).catch(console.error);
  client.on('ready', () => {
    console.log('Discord RPC connected!');
    client.setActivity({
      details: 'by H2O Studio',
      largeImageKey: 'icon',
      largeImageText: '카트플러그',
      startTimestamp: new Date(),
      instance: false,
    });
  });

  ipcMain.on('minimize-window', () => {
    mainWindow.minimize();
  });

  ipcMain.on('close-window', () => {
    mainWindow.close();
  });

  ipcMain.on('open-external', (event, url) => {
    require('electron').shell.openExternal(url);
  });

  ipcMain.on('push-notification', (event, title, body) => {
    new Notification({
      title,
      body,
    }).show();
  });

  ipcMain.on('change-presence', (event, game) => {
    var gameTitle = ["카트라이더", "JL GOLF: Nice Shot"];
    var gameDetail = "";
    switch (game) {
      case 'kart':
        gameDetail = gameTitle[0];
        break;
      case 'jlgolf':
        gameDetail = gameTitle[1];
        break;
      default:
        gameDetail = '카트플러그';
        break;
    }
    client.setActivity({
      details: gameDetail,
      largeImageKey: game,
      largeImageText: gameDetail,
      startTimestamp: new Date(),
      instance: false,
    });
  });

  ipcMain.on('alert', (event, title, message) => {
    require('electron').dialog.showMessageBoxSync({
      type: 'info',
      title,
      message,
    });
  });

  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (canceled) {
      return
    } else {
      return filePaths[0]
    }
  })

  ipcMain.on('easteregg', (event) => {
    const easterEggWindow = new BrowserWindow({
      width: 1550,
      height: 900,
      title: 'SeguRider Client',
      icon: path.join(__dirname, 'games/gosegu/icon.png'),
      autoHideMenuBar: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'preload.js'),
      },
    });
    easterEggWindow.loadFile(path.join(__dirname, 'easteregg.html'));

    easterEggWindow.webContents.on('will-navigate', (e, url) => {
      if (url !== 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' && url !== 'easteregg.html') {
        easterEggWindow.close();
      }
    });
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });



});


// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
