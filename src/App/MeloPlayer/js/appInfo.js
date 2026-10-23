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
function readPackageVersion(file)
{
  try {const version = JSON.parse(fs.readFileSync(file, 'utf8')).version; return version ? String(version) : null;}
  catch (error) {return null;}
}
//Version = "version" in package.json (the highest of the app's manifest and the package.json files around index.html;
//.melo-version is written by the updater, in case the downloaded package.json didn't have the new number)
function getAppVersion()
{
  const found = [];
  try {if (nw.App.manifest && nw.App.manifest.version) {found.push(String(nw.App.manifest.version));}} catch (error) {}
  if (appFolder)
  {
    let folder = appFolder;
    for (let level = 0; level < 3; level++)
    {
      const version = readPackageVersion(nodePath.join(folder, 'package.json'));
      if (version) {found.push(version);}
      folder = nodePath.dirname(folder);
    }
    try {const text = fs.readFileSync(nodePath.join(appFolder, '.melo-version'), 'utf8').trim(); if (text) {found.push(text);}} catch (error) {}
  }
  if (found.length === 0) {return '0';}
  return found.reduce(function(best, version) {return compareVersions(version, best) > 0 ? version : best;});
}
const appVersion = getAppVersion();
