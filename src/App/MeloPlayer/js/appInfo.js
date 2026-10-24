//App folder and version number (used by Settings > Info and the updater).
const appRepositoryUrl = 'https://github.com/banekondic1996/Melo-MediaPlayer';
const appCreator = 'Bane Kondic';

//Folder of the running app (the one with index.html). Found from the path of this page, then from the folders NW.js was started in
function getAppFolder()
{
  const candidates = [];
  try {if (typeof module !== 'undefined' && module.filename) {candidates.push(nodePath.dirname(module.filename));}} catch (error) {}
  try {if (typeof __dirname !== 'undefined') {candidates.push(__dirname);}} catch (error) {}
  try {candidates.push(nw.App.startPath);} catch (error) {}
  candidates.push(process.cwd());
  try {candidates.push(nodePath.dirname(process.execPath));} catch (error) {}
  for (const folder of candidates)
  {
    if (!folder) {continue;}
    for (const option of [folder, nodePath.join(folder, 'App', 'MeloPlayer')])
    {
      if (fs.existsSync(nodePath.join(option, 'index.html'))) {return option;}
    }
  }
  return null;
}
//First version looking number in a text, like 1.4 or 2026.10.23 ("Melo-linux-1.4.zip" -> "1.4")
function parseVersion(text)
{
  const match = String(text).match(/(\d+(?:\.\d+)+)/);
  return match ? match[1] : null;
}
//1 if a is newer, -1 if older, 0 same
function compareVersions(a, b)
{
  const x = String(a).split('.').map(Number);
  const y = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++)
  {
    const difference = (x[i] || 0) - (y[i] || 0);
    if (difference !== 0) {return difference > 0 ? 1 : -1;}
  }
  return 0;
}
const appFolder = getAppFolder();
//Folder with the package.json that NW.js starts (its "main" points to the index.html in the app folder). With a plain layout it is the app folder itself.
//Example: /opt/ElveApps/MeloPlayer (nw, node_modules, package.json) with the app in App/MeloPlayer
function getAppRoot()
{
  if (!appFolder) {return null;}
  let folder = appFolder;
  for (let level = 0; level < 4; level++)
  {
    const packageFile = nodePath.join(folder, 'package.json');
    try
    {
      if (fs.existsSync(packageFile))
      {
        const main = JSON.parse(fs.readFileSync(packageFile, 'utf8')).main || 'index.html';
        if (nodePath.resolve(folder, main) === nodePath.join(appFolder, 'index.html')) {return folder;}
      }
    }
    catch (error) {}
    const parent = nodePath.dirname(folder);
    if (parent === folder) {break;}
    folder = parent;
  }
  return appFolder;
}
const appRoot = getAppRoot();
function readPackageVersion(file)
{
  try {const version = JSON.parse(fs.readFileSync(file, 'utf8')).version; return version ? String(version) : null;}
  catch (error) {return null;}
}
//Version = "version" in the package.json NW.js starts (the one in the install root, e.g. /opt/ElveApps/MeloPlayer/package.json)
function getAppVersion()
{
  let version = null;
  try {if (nw.App.manifest && nw.App.manifest.version) {version = String(nw.App.manifest.version);}} catch (error) {}
  if (!version && appRoot) {version = readPackageVersion(nodePath.join(appRoot, 'package.json'));}
  if (!version && appFolder) {version = readPackageVersion(nodePath.join(appFolder, 'package.json'));}
  return version || '0';
}
const appVersion = getAppVersion();
