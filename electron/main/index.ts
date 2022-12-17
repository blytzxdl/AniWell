// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = app.isPackaged
    ? process.env.DIST
    : join(process.env.DIST_ELECTRON, '../public')
process.env.APPROOT = app.isPackaged ? process.env.DIST : join(process.env.DIST_ELECTRON, '../')
import { app, BrowserWindow, shell, ipcMain, Menu, Tray, session } from 'electron'
import { readdir } from 'fs/promises'
import { release, type, homedir } from 'os'
import { join, resolve } from 'path'
import '../server'
// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
    win = new BrowserWindow({
        title: 'FileServer',
        icon: join(process.env.PUBLIC, 'favicon.ico'),
        webPreferences: {
            preload,
            // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
            // Consider using contextBridge.exposeInMainWorld
            // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
            // nodeIntegration: true,
            // contextIsolation: true,
        },
        width: 1920,
        height: 1080,
    })

    if (process.env.VITE_DEV_SERVER_URL) {
        // electron-vite-vue#298
        win.loadURL(url)
        // Open devTool if the app is not packaged
        win.webContents.openDevTools()
    } else {
        win.loadFile(indexHtml)
    }

    // Test actively push message to the Electron-Renderer
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', new Date().toLocaleString())
    })

    // Make all links open with the browser, not with the application
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:')) shell.openExternal(url)
        return { action: 'deny' }
    })
}
const dataPath: string =
    import.meta.env.DEV === true
        ? resolve('./')
        : type() == 'Linux'
        ? resolve(homedir(), 'AppData/FileServer-for-qBittorrent')
        : type() == 'Windows_NT'
        ? resolve(homedir(), 'AppData/Roaming/FileServer-for-qBittorrent')
        : '.'
let tray: Tray
app.whenReady().then(async () => {
    //加载vue.js.devtools
    if (import.meta.env.DEV === true) {
        try {
            const devtoolsPath = resolve(
                homedir(),
                process.env.LOCALAPPDATA,
                'Google/Chrome/User Data/Default/Extensions/nhdogjmejiglipccpnnnanhbledajbpd',
            )
            const version = (await readdir(devtoolsPath)).sort((a, b) => (a > b ? -1 : 1))[0]
            await session.defaultSession.loadExtension(resolve(devtoolsPath, version))
            console.log('vue-devtools on')
        } catch (error) {}
    }
    createWindow()
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '数据目录',
            type: 'normal',
            click() {
                shell.openPath(dataPath)
            },
        },
        {
            label: '应用目录',
            type: 'normal',
            click() {
                shell.openPath(resolve('./'))
            },
        },
        {
            label: '重启',
            type: 'normal',
            click() {
                app.relaunch()
                app.quit()
            },
        },
        { label: '退出', type: 'normal', role: 'quit' },
    ])
    try {
        const iconPath: string = join(process.env.PUBLIC, 'favicon.ico')
        tray = new Tray(iconPath)
        tray.setContextMenu(contextMenu)
        tray.setToolTip('FileServer')
        tray.setTitle('FileServer')
        console.log('tray on')
    } catch (error) {
        console.log('tray off')
    }
})

app.on('window-all-closed', () => {
    win = null
    // if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
    if (win) {
        // Focus on the main window if the user tried to open another
        if (win.isMinimized()) win.restore()
        win.focus()
    }
})

app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
        allWindows[0].focus()
    } else {
        createWindow()
    }
})

// New window example arg: new windows url
// ipcMain.handle('open-win', (event, arg) => {
//   const childWindow = new BrowserWindow({
//     webPreferences: {
//       preload,
//       nodeIntegration: true,
//       contextIsolation: false,
//     },
//   })

//   if (process.env.VITE_DEV_SERVER_URL) {
//     childWindow.loadURL(`${url}#${arg}`)
//   } else {
//     childWindow.loadFile(indexHtml, { hash: arg })
//   }
// })

export default app
