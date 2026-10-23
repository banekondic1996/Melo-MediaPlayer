//Settings are saved in a config file (melo-config.json) inside the NW.js user data folder
const nodePath = require('path');
const settingsDefaults = {
  darkMode: true,
  visualizerPreset: 94,
  complexVisuals: true,
  volume: 99,
  audioMono: false,
  audioDevice: '',
  settingsTab: 'audio',
  timeZone: 'system',
  autoTime: true,
  spectrumV: 2,
  spectrum: {colorLow: '#00ff8c', colorHigh: '#00ebff', type: 'line', barGap: 2, lineWidth: 2, peaks: false, glow: 14, bands: 128, minDb: -90, maxDb: -10, smoothing: 80, grid: 100},
  eqGains: [0,0,0,0,0,0,0,0,0,0],
  subtitle: {size: 28, color: '#ffffff', bgOpacity: 50, bottom: 8, delay: 0, encoding: 'auto'}
};
function getSettingsFilePath()
{
  let folder;
  try {folder = nw.App.dataPath;} catch (error) {}
  if (!folder) {folder = process.cwd();}
  return nodePath.join(folder, 'melo-config.json');
}
const settingsFile = getSettingsFilePath();
//Read config file, anything missing falls back to the defaults
function loadSettings()
{
  let loaded = {};
  try
  {
    if (fs.existsSync(settingsFile)) {loaded = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));}
  }
  catch (error) {console.error("Could not read settings:", error);}
  if (typeof loaded !== 'object' || loaded === null) {loaded = {};}
  const merged = Object.assign({}, settingsDefaults, loaded);
  merged.subtitle = Object.assign({}, settingsDefaults.subtitle, loaded.subtitle);
  merged.spectrum = Object.assign({}, settingsDefaults.spectrum, loaded.spectrum);
  if (loaded.spectrumV !== 2) {merged.spectrum.type = 'line'; merged.spectrumV = 2;} //Default graph is now the line
  if (!Array.isArray(merged.eqGains) || merged.eqGains.length !== 10) {merged.eqGains = settingsDefaults.eqGains.slice();}
  return merged;
}
let settings = loadSettings();
let saveSettingsTimeout = null;
function writeSettingsNow()
{
  clearTimeout(saveSettingsTimeout);
  saveSettingsTimeout = null;
  try {fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');}
  catch (error) {console.error("Could not save settings:", error);}
}
//Saves a moment after the last change, so dragging a slider doesn't write the file on every step
function saveSettings()
{
  clearTimeout(saveSettingsTimeout);
  saveSettingsTimeout = setTimeout(writeSettingsNow, 300);
}
function setSetting(key, value)
{
  settings[key] = value;
  saveSettings();
}
//Don't lose a change made right before closing the app
window.addEventListener('beforeunload', function() {if (saveSettingsTimeout !== null) {writeSettingsNow();}});
