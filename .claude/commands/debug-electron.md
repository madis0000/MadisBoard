# Debug Electron Issues

Diagnose and fix Electron-specific runtime and build issues for the MadisBoard desktop app.

## Arguments

- $ARGUMENTS: Symptom or area to debug:
  - "blank" / "white screen" — Window shows nothing
  - "crash" — App crashes on launch or during use
  - "ipc" — IPC communication issues
  - "protocol" — madisboard:// deep link issues
  - "build" — Package/make failures
  - "native" — Native module problems
  - An error message — Specific error to diagnose

## Debug Process

### 1. Enable Electron Logging

```bash
# Windows
set ELECTRON_ENABLE_LOGGING=1
yarn workspace @affine/electron dev

# macOS/Linux
ELECTRON_ENABLE_LOGGING=1 yarn workspace @affine/electron dev
```

### 2. Symptom-Specific Diagnosis

**Blank/White Screen:**

1. Open DevTools: Ctrl+Shift+I / Cmd+Option+I
2. Check Console for errors
3. Check Network tab for failed loads
4. Verify renderer entry point exists: `packages/frontend/apps/electron-renderer/dist/`
5. Check preload script path in BrowserWindow config
6. Verify loadURL/loadFile path is correct

**Crash on Launch:**

1. Check electron crash reports directory
2. Run with `--inspect` to debug main process
3. Check if native modules are compatible:
   ```bash
   node -e "require('@affine/native')"
   npx electron -e "require('@affine/native')"
   ```
4. Verify Electron ABI matches native module build

**IPC Issues:**

1. Check preload script exposes correct API
2. Verify contextIsolation settings
3. Check ipcMain/ipcRenderer handler names match
4. Look for "ipc" in renderer console errors
5. Verify channel whitelisting in preload

**Protocol Handler (madisboard://):**

1. Check app.setAsDefaultProtocolClient() is called
2. Verify protocol registration in main process
3. On Windows, check registry entries
4. On macOS, check Info.plist URL schemes
5. Test: `madisboard://open?workspace=xxx`

**Build/Package Failures:**

1. Read forge.config.mjs carefully
2. Check makers are configured for current platform
3. Verify all resources exist (icons, entitlements)
4. Check code signing configuration
5. Run with verbose: `DEBUG=electron-forge:* yarn affine electron-forge:package`

**Native Module Issues:**

1. Rebuild native modules for Electron:
   ```bash
   npx electron-rebuild
   ```
2. Check Electron version matches native build target
3. Verify node-abi compatibility
4. On Windows, check Visual Studio Build Tools

### 3. Common Fixes

**Renderer Not Loading:**

```javascript
// main process - check this is correct
mainWindow.loadURL(isDev ? 'http://localhost:8080' : `file://${path.join(__dirname, '../renderer/index.html')}`);
```

**Preload Script Missing:**

```javascript
// forge.config.mjs - ensure preload is in entry points
{
  name: 'main_window',
  preload: {
    js: './src/preload/index.ts'
  }
}
```

**Native Module ABI Mismatch:**

```bash
# Delete and rebuild
rm -rf packages/frontend/native/artifacts
rm -rf packages/frontend/native/*.node
yarn affine @affine/native build
npx electron-rebuild
```

**Context Isolation Issues:**

```javascript
// main process - security settings
new BrowserWindow({
  webPreferences: {
    nodeIntegration: false, // MUST be false
    contextIsolation: true, // MUST be true
    preload: path.join(__dirname, 'preload.js'),
    sandbox: true, // Recommended
  },
});
```

### 4. Debug Tools

**Main Process Debugging:**

```bash
# Launch with inspector
yarn workspace @affine/electron dev --inspect
# Then attach Chrome DevTools to chrome://inspect
```

**Renderer Debugging:**

```javascript
// In main process, open DevTools automatically
mainWindow.webContents.openDevTools();
```

**Check Electron Internals:**

```javascript
// In main process
const electron = require('electron');
console.log('Electron version:', process.versions.electron);
console.log('Chrome version:', process.versions.chrome);
console.log('Node version:', process.versions.node);
console.log('Platform:', process.platform);
console.log('Arch:', process.arch);
```

### 5. Report Format

```
## Electron Debug Report

### Environment
- Electron: (version)
- Node: (version)
- Platform: (win32/darwin/linux)
- Arch: (x64/arm64)

### Symptom
(User-reported issue)

### Console Errors
(Any JavaScript errors from DevTools)

### Main Process Logs
(Relevant stdout/stderr)

### Root Cause
(Identified cause)

### Fix
(Step-by-step solution)

### Prevention
(How to avoid in future)
```

## Escalation

If issue persists:

1. Invoke Desktop Agent for deeper analysis
2. Check Electron Forge documentation
3. Search Electron GitHub issues
4. Check upstream AFFiNE for similar issues
