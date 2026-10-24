//Update: downloads the release for this OS (name has "linux" or "windows") from GitHub and unpacks it into a folder next to the app (MeloPlayer-version).
//Then the player closes and a small script moves the files into the main folder and starts the player again.
const updateRepository = 'banekondic1996/Melo-MediaPlayer';
const updateTag = 'development';
let updateRunning = false;

//Progress window (same look as the other dialogs)
const updateDialog = document.createElement('div');
updateDialog.className = 'inputDialog';
updateDialog.id = 'updateDialogID';
updateDialog.style.cssText = 'height:auto;width:340px;padding-bottom:10px;align-items:center;';
const updateText = document.createElement('div');
updateText.style.cssText = 'width:300px;text-align:center;padding-bottom:8px;word-break:break-word;';
const updateBar = document.createElement('progress');
updateBar.className = 'accentSlider';
updateBar.max = 100;
updateBar.style.width = '300px';
const updateCloseButton = document.createElement('input');
updateCloseButton.type = 'button';
updateCloseButton.value = 'Close';
updateCloseButton.style.cssText = 'height:40px;border-radius:10px;';
updateCloseButton.onclick = function() {updateDialog.style.display = 'none';};
updateDialog.appendChild(updateText);
updateDialog.appendChild(updateBar);
const updateButtons = document.createElement('div');
updateButtons.appendChild(updateCloseButton);
updateDialog.appendChild(updateButtons);
document.body.appendChild(updateDialog);
//value 0 - 100, or null for "working, unknown time"
function setUpdateStatus(text, value, canClose, canRestart)
{
  updateDialog.style.display = 'flex';
  updateText.textContent = text;
  if (value === null) {updateBar.removeAttribute('value');} else {updateBar.value = value;}
  updateCloseButton.style.display = canClose ? '' : 'none';
}

//HTTPS get that follows redirects (GitHub sends downloads to another address)
function updateRequest(url, headers, onResponse, onError, redirects)
{
  const request = require('https').get(url, {headers: Object.assign({'User-Agent': 'Melo-Updater'}, headers)}, function(response)
  {
    if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location)
    {
      response.resume();
      if ((redirects || 0) > 6) {onError(new Error('Too many redirects')); return;}
      updateRequest(new URL(response.headers.location, url).toString(), headers, onResponse, onError, (redirects || 0) + 1);
      return;
    }
    if (response.statusCode !== 200) {response.resume(); onError(new Error('Server answered ' + response.statusCode)); return;}
    onResponse(response);
  });
  request.on('error', onError);
  request.setTimeout(30000, function() {request.destroy(new Error('Connection timed out'));});
}
function updateGetJson(url)
{
  return new Promise(function(resolve, reject)
  {
    updateRequest(url, {'Accept': 'application/vnd.github+json'}, function(response)
    {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', function(chunk) {body += chunk;});
      response.on('end', function() {try {resolve(JSON.parse(body));} catch (error) {reject(error);}});
      response.on('error', reject);
    }, reject);
  });
}
function updateDownload(url, destination, expectedSize)
{
  return new Promise(function(resolve, reject)
  {
    updateRequest(url, {}, function(response)
    {
      const total = parseInt(response.headers['content-length'], 10) || expectedSize || 0;
      let received = 0;
      const file = fs.createWriteStream(destination);
      response.on('data', function(chunk)
      {
        received += chunk.length;
        const megabytes = (received / 1048576).toFixed(1);
        if (total > 0) {setUpdateStatus('Downloading ' + megabytes + ' / ' + (total / 1048576).toFixed(1) + ' MB', Math.min(100, received * 100 / total), false);}
        else {setUpdateStatus('Downloading ' + megabytes + ' MB', null, false);}
      });
      response.pipe(file);
      file.on('finish', function() {file.close(function() {resolve();});});
      file.on('error', reject);
      response.on('error', reject);
    }, reject);
  });
}
//Unpack zip with the tools the OS already has
function updateExtract(zipFile, folder)
{
  const quote = function(text) {return "'" + text.replace(/'/g, "''") + "'";};
  const attempts = process.platform === 'win32'
  ? [['tar', ['-xf', zipFile, '-C', folder]], ['powershell', ['-NoProfile', '-Command', 'Expand-Archive -Force -LiteralPath ' + quote(zipFile) + ' -DestinationPath ' + quote(folder)]]]
  : [['unzip', ['-o', '-q', zipFile, '-d', folder]], ['bsdtar', ['-xf', zipFile, '-C', folder]], ['7z', ['x', '-y', '-o' + folder, zipFile]], ['python3', ['-m', 'zipfile', '-e', zipFile, folder]]];
  return new Promise(function(resolve, reject)
  {
    let index = 0;
    const tryNext = function()
    {
      if (index >= attempts.length) {reject(new Error('Could not unpack the zip (no unzip tool found)')); return;}
      const attempt = attempts[index++];
      require('child_process').execFile(attempt[0], attempt[1], {maxBuffer: 1024 * 1024 * 20}, function(error)
      {
        if (!error || (attempt[0] === 'unzip' && error.code === 1)) {resolve();} //unzip code 1 = only warnings
        else {tryNext();}
      });
    };
    tryNext();
  });
}
//Folder inside the unpacked update that holds package.json (zips often have one top folder)
function findUpdateRoot(folder, depth)
{
  if (fs.existsSync(nodePath.join(folder, 'package.json')) || fs.existsSync(nodePath.join(folder, 'index.html'))) {return folder;}
  if (depth <= 0) {return null;}
  for (const entry of fs.readdirSync(folder, {withFileTypes: true}))
  {
    if (entry.isDirectory())
    {
      const found = findUpdateRoot(nodePath.join(folder, entry.name), depth - 1);
      if (found) {return found;}
    }
  }
  return null;
}
//All files of a folder, as paths relative to base
function listUpdateFiles(folder, base, result)
{
  fs.readdirSync(folder, {withFileTypes: true}).forEach(function(entry)
  {
    const full = nodePath.join(folder, entry.name);
    let isFolder = entry.isDirectory();
    if (entry.isSymbolicLink()) {try {isFolder = fs.statSync(full).isDirectory();} catch (error) {return;}}
    if (isFolder) {listUpdateFiles(full, base, result);}
    else {result.push(nodePath.relative(base, full));}
  });
  return result;
}
function updateRemoveFolder(folder) {try {fs.rmSync(folder, {recursive: true, force: true});} catch (error) {}}
//The running app can't be replaced while it is open, so a small script is started that waits until the player has closed,
//moves the unpacked files into the main folder, deletes the temporary folder and starts the player again
function installUpdateAndRestart(stagingFolder, destFolder, launchFolder)
{
  const spawnProcess = require('child_process').spawn;
  const logFile = nodePath.join(nw.App.dataPath, 'melo-update.log');
  const args = (nw.App.argv || []).slice();
  let script;
  let command;
  let commandArgs;
  if (process.platform === 'win32')
  {
    script = nodePath.join(require('os').tmpdir(), 'melo-apply-update.bat');
    fs.writeFileSync(script, [
      '@echo off',
      'set PID=%~1',
      'set PPID2=%~2',
      'set SRC=%~3',
      'set DEST=%~4',
      'set LAUNCH=%~6',
      'set EXE=%~5',
      'set /a TRIES=0',
      ':wait',
      'set /a TRIES+=1',
      'set RUNNING=0',
      'tasklist /FI "PID eq %PID%" 2>nul | find "%PID%" >nul && set RUNNING=1',
      'tasklist /FI "PID eq %PPID2%" 2>nul | find "%PPID2%" >nul && set RUNNING=1',
      'if %RUNNING%==1 if %TRIES% LSS 60 (ping -n 2 127.0.0.1 >nul & goto wait)',
      'ping -n 3 127.0.0.1 >nul',
      'echo %date% %time% moving files >> "' + logFile + '"',
      'xcopy "%SRC%\\*" "%DEST%\\" /E /Y /I /Q >> "' + logFile + '" 2>&1',
      'rmdir /S /Q "%SRC%"',
      'shift & shift & shift & shift & shift & shift',
      'start "" "%EXE%" "%LAUNCH%" %1 %2 %3 %4 %5 %6 %7 %8 %9',
      ''
    ].join('\r\n'));
    command = 'cmd.exe';
    commandArgs = ['/c', script, String(process.pid), String(process.ppid), stagingFolder, destFolder, process.execPath, launchFolder].concat(args);
  }
  else
  {
    script = nodePath.join(require('os').tmpdir(), 'melo-apply-update.sh');
    fs.writeFileSync(script, [
      '#!/bin/sh',
      'PID="$1"; PPID2="$2"; SRC="$3"; DEST="$4"; EXE="$5"; LAUNCH="$6"; shift 6',
      'i=0',
      'while { kill -0 "$PID" 2>/dev/null || kill -0 "$PPID2" 2>/dev/null; } && [ $i -lt 60 ]; do sleep 0.5; i=$((i+1)); done',
      'sleep 2',
      'echo "$(date) moving files" >> "' + logFile + '"',
      'cp -rf "$SRC"/. "$DEST"/ >> "' + logFile + '" 2>&1 && rm -rf "$SRC"',
      'exec "$EXE" "$LAUNCH" "$@"',
      ''
    ].join('\n'), {mode: 0o755});
    command = 'sh';
    commandArgs = [script, String(process.pid), String(process.ppid), stagingFolder, destFolder, process.execPath, launchFolder].concat(args);
  }
  spawnProcess(command, commandArgs, {detached: true, stdio: 'ignore', windowsHide: true}).unref();
  setTimeout(function() {nw.App.quit();}, 500); //Player closes first, the script waits for that
}
async function updateApp()
{
  if (updateRunning) {setUpdateStatus(updateText.textContent, updateBar.hasAttribute('value') ? updateBar.value : null, false, false); return;}
  updateRunning = true;
  const work = nodePath.join(require('os').tmpdir(), 'melo-update-' + Date.now());
  let target = null;
  let finished = false;
  try
  {
    if (!appFolder) {throw new Error('Could not find the Melo folder (the one with index.html)');}
    const keyword = process.platform === 'win32' ? 'windows' : (process.platform === 'linux' ? 'linux' : (process.platform === 'darwin' ? 'mac' : ''));
    if (!keyword) {throw new Error('Updates are not available for this system');}
    setUpdateStatus('Checking for the latest version...', null, false, false);
    const release = await updateGetJson('https://api.github.com/repos/' + updateRepository + '/releases/tags/' + updateTag);
    const assets = (release.assets || []).filter(function(asset) {return asset.name.toLowerCase().includes(keyword) && /\.zip$/i.test(asset.name);});
    if (assets.length === 0) {throw new Error('No ' + keyword + ' zip found in the release');}
    const asset = assets[0];
    //The version number is in the file name
    let version = parseVersion(asset.name);
    if (!version && settings.devIgnoreVersion) {version = 'dev';}
    if (!version) {throw new Error('No version number in the file name "' + asset.name + '"');}
    if (!settings.devIgnoreVersion && compareVersions(version, appVersion) <= 0)
    {
      setUpdateStatus('You have the latest version (' + appVersion + ')', 100, true, false);
      finished = true;
    }
    else
    {
      fs.mkdirSync(work, {recursive: true});
      const zipFile = nodePath.join(work, asset.name);
      await updateDownload(asset.browser_download_url, zipFile, asset.size);
      setUpdateStatus('Unpacking...', null, false, false);
      const unpacked = nodePath.join(work, 'files');
      fs.mkdirSync(unpacked);
      await updateExtract(zipFile, unpacked);
      const root = findUpdateRoot(unpacked, 3);
      if (!root) {throw new Error('The update does not look like Melo (no package.json or index.html)');}
      //Where the files go: the update zip can hold the whole install (package.json, nw, App/MeloPlayer/...) or only the app folder (index.html, js, css...)
      const relativeApp = nodePath.relative(appRoot, appFolder);
      let destination;
      if (relativeApp && fs.existsSync(nodePath.join(root, relativeApp, 'index.html'))) {destination = appRoot;}
      else if (fs.existsSync(nodePath.join(root, 'index.html'))) {destination = appFolder;}
      else {throw new Error('The update has a different folder layout than this install (no ' + (relativeApp ? relativeApp + '/' : '') + 'index.html)');}
      console.log("Update: files go to " + destination);
      //New folder next to the destination (name-version). If that place isn't writable, in the app data folder
      const baseName = nodePath.basename(destination);
      target = nodePath.join(nodePath.dirname(destination), baseName + '-' + version);
      try {updateRemoveFolder(target); fs.mkdirSync(target, {recursive: true}); fs.accessSync(target, fs.constants.W_OK);}
      catch (error)
      {
        target = nodePath.join(nw.App.dataPath, 'app-versions', baseName + '-' + version);
        updateRemoveFolder(target);
        fs.mkdirSync(target, {recursive: true});
      }
      const jobs = listUpdateFiles(root, root, []).map(function(file) {return {from: nodePath.join(root, file), to: nodePath.join(target, file)};});
      for (let i = 0; i < jobs.length; i++)
      {
        fs.mkdirSync(nodePath.dirname(jobs[i].to), {recursive: true});
        fs.copyFileSync(jobs[i].from, jobs[i].to);
        if (i % 25 === 0)
        {
          setUpdateStatus('Installing ' + (i + 1) + ' / ' + jobs.length, (i + 1) * 100 / jobs.length, false, false);
          await new Promise(function(resolve) {setTimeout(resolve, 0);}); //Let the window redraw
        }
      }
      finished = true;
      setUpdateStatus('Version ' + version + ' is ready. The player will close, install it and start again...', 100, false, false);
      await new Promise(function(resolve) {setTimeout(resolve, 2500);});
      installUpdateAndRestart(target, destination, appRoot);
    }
  }
  catch (error)
  {
    console.log("Update failed: " + error.message);
    if (target && !finished) {updateRemoveFolder(target);} //Don't leave a half copied version
    setUpdateStatus('Update failed: ' + error.message, 0, true, false);
  }
  updateRunning = false;
  updateRemoveFolder(work);
}
