//Settings window (Menu > Settings): tabs for audio, frequency analyser, subtitles and player options
const settingsContent = document.createElement('div');
settingsContent.style.cssText = 'display:flex;flex-direction:column;align-items:center;max-height:calc(100vh - 220px);overflow-y:auto;overflow-x:hidden;padding:0px 8px;';
function createSettingsHeading(text)
{
  const heading = document.createElement('div');
  heading.textContent = text;
  heading.style.cssText = 'width:380px;font-weight:bold;padding:6px 0px 4px 0px;border-bottom:1px solid #80808066;margin-bottom:4px;';
  return heading;
}
//Tabs on top, each tab has its own page
const settingsTabBar = document.createElement('div');
settingsTabBar.style.cssText = 'display:flex;justify-content:center;flex-wrap:wrap;';
const settingsPages = {};
const settingsTabButtons = {};
function createSettingsPage(key, title)
{
  const page = document.createElement('div');
  page.style.cssText = 'display:none;flex-direction:column;align-items:center;';
  settingsPages[key] = page;
  const button = document.createElement('input');
  button.type = 'button';
  button.value = title;
  button.style.cssText = 'height:34px;border-radius:10px;border:2px solid transparent;';
  button.onclick = function() {showSettingsTab(key);};
  settingsTabButtons[key] = button;
  settingsTabBar.appendChild(button);
  settingsContent.appendChild(page);
  return page;
}
function showSettingsTab(key)
{
  Object.keys(settingsPages).forEach(function(name)
  {
    settingsPages[name].style.display = (name === key) ? 'flex' : 'none';
    const active = (name === key);
    settingsTabButtons[name].style.border = active ? '2px solid var(--sliderColorFull)' : '2px solid transparent';
    settingsTabButtons[name].style.color = active ? 'var(--sliderColorFull)' : '';
  });
  setSetting('settingsTab', key);
  updateSettingsBackdrop();
}
//Tab buttons are their own small window at the top, the settings window itself is centered
const settingsTabDialog = document.createElement('div');
settingsTabDialog.className = 'inputDialog';
settingsTabDialog.id = 'settingsTabDialogID';
settingsTabDialog.style.cssText = 'z-index:1002;position-area:none;position:fixed;top:12px;left:50%;transform:translateX(-50%);margin:0px;height:auto;width:auto;max-width:calc(100vw - 20px);padding:6px 10px;flex-direction:row;flex-wrap:wrap;justify-content:center;';
settingsTabDialog.appendChild(settingsTabBar);
document.body.appendChild(settingsTabDialog);
//Blurred background behind the settings. It fades away on the Subtitles tab in video mode, so the subtitles can be seen while changing them
const settingsBackdrop = document.createElement('div');
settingsBackdrop.style.cssText = 'display:none;position:fixed;top:0px;left:0px;width:100%;height:100%;z-index:999;backdrop-filter:blur(6px);opacity:0;transition:opacity 0.4s;';
document.body.appendChild(settingsBackdrop);
let settingsOpen = false;
function updateSettingsBackdrop()
{
  if (!settingsOpen) {return;}
  const videoMode = videoContainerElement.style.display === 'block';
  const clear = (settings.settingsTab === 'subtitles' && videoMode);
  settingsBackdrop.style.opacity = clear ? '0' : '1';
  settingsBackdrop.style.pointerEvents = clear ? 'none' : 'auto';
}
const audioPage = createSettingsPage('audio', 'Audio');
const spectrumPage = createSettingsPage('spectrum', 'Analyser');
const subtitlePage = createSettingsPage('subtitles', 'Subtitles');
const playerPage = createSettingsPage('player', 'Player');
const infoPage = createSettingsPage('info', 'Info');
//------ Audio ------
audioPage.appendChild(createSettingsHeading('Audio'));
const audioDeviceSelect = document.createElement('select');
audioDeviceSelect.style.width = '150px';
audioDeviceSelect.onchange = function() {setAudioDevice(audioDeviceSelect.value);};
audioPage.appendChild(createSubtitleRow('Output device', audioDeviceSelect));
const audioChannelsSelect = document.createElement('select');
audioChannelsSelect.style.width = '150px';
[['stereo', 'Stereo'], ['mono', 'Mono']].forEach(function(item)
{
  const option = document.createElement('option');
  option.value = item[0];
  option.textContent = item[1];
  audioChannelsSelect.appendChild(option);
});
audioChannelsSelect.value = settings.audioMono ? 'mono' : 'stereo';
audioChannelsSelect.onchange = function() {setAudioMono(audioChannelsSelect.value === 'mono');};
audioPage.appendChild(createSubtitleRow('Channels', audioChannelsSelect));
//List of audio outputs. Browsers hide device ids and names until an audio permission was given,
//so when nothing usable is listed we ask once (the microphone stream is closed right away, only the permission is needed)
let audioDevicePermissionAsked = false;
function fillAudioDevices(devices)
{
  audioDeviceSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'System default';
  audioDeviceSelect.appendChild(defaultOption);
  let count = 0;
  devices.forEach(function(device)
  {
    if (device.kind !== 'audiooutput' || !device.deviceId || device.deviceId === 'default' || device.deviceId === 'communications') {return;}
    count++;
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || ('Audio device ' + count);
    audioDeviceSelect.appendChild(option);
  });
  audioDeviceSelect.value = settings.audioDevice || '';
  if (audioDeviceSelect.value !== (settings.audioDevice || '')) {audioDeviceSelect.value = '';}
}
function refreshAudioDevices()
{
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {return;}
  navigator.mediaDevices.enumerateDevices().then(function(devices)
  {
    const usable = devices.some(function(device) {return device.kind === 'audiooutput' && device.deviceId && device.deviceId !== 'default' && device.label;});
    if (!usable && !audioDevicePermissionAsked && navigator.mediaDevices.getUserMedia)
    {
      audioDevicePermissionAsked = true;
      navigator.mediaDevices.getUserMedia({audio: true})
      .then(function(stream) {stream.getTracks().forEach(function(track) {track.stop();}); return navigator.mediaDevices.enumerateDevices();})
      .then(fillAudioDevices)
      .catch(function(error) {console.log("No audio permission: " + error.message); fillAudioDevices(devices);});
    }
    else {fillAudioDevices(devices);}
  }).catch(function(error) {console.log("Could not list audio devices: " + error.message);});
}
//Chrome's own device picker, if this version has it
if (navigator.mediaDevices && navigator.mediaDevices.selectAudioOutput)
{
  const pickButton = document.createElement('input');
  pickButton.type = 'button';
  pickButton.value = 'Choose...';
  pickButton.style.cssText = 'height:30px;border-radius:10px;';
  pickButton.onclick = function()
  {
    navigator.mediaDevices.selectAudioOutput().then(function(device)
    {
      settings.audioDevice = device.deviceId;
      refreshAudioDevices();
      setAudioDevice(device.deviceId);
    }).catch(function(error) {console.log("No device chosen: " + error.message);});
  };
  audioPage.appendChild(createSubtitleRow('More devices', pickButton));
}
if (navigator.mediaDevices) {navigator.mediaDevices.addEventListener('devicechange', refreshAudioDevices);}
//Info tab
infoPage.appendChild(createSettingsHeading('Melo Player'));
function createInfoText(text)
{
  const span = document.createElement('span');
  span.textContent = text;
  return span;
}
infoPage.appendChild(createSubtitleRow('Creator', createInfoText(appCreator)));
infoPage.appendChild(createSubtitleRow('Version', createInfoText(appVersion)));
const githubButton = document.createElement('input');
githubButton.type = 'button';
githubButton.value = 'GitHub';
githubButton.style.cssText = 'height:34px;border-radius:10px;';
githubButton.onclick = function() {try {nw.Shell.openExternal(appRepositoryUrl);} catch (error) {console.log("Could not open link: " + error.message);}};
infoPage.appendChild(createSubtitleRow('Source code', githubButton));
const updateCheckButton = document.createElement('input');
updateCheckButton.type = 'button';
updateCheckButton.value = 'Update';
updateCheckButton.style.cssText = 'height:34px;border-radius:10px;';
updateCheckButton.onclick = function() {settingsMenu.hide(); updateApp();};
infoPage.appendChild(createSubtitleRow('Check for new version', updateCheckButton));
//Unpause at time: time zone and auto update
playerPage.appendChild(createSettingsHeading('Unpause at time'));
const timeZoneSelect = document.createElement('select');
timeZoneSelect.style.width = '200px';
const systemZoneOption = document.createElement('option');
systemZoneOption.value = 'system';
systemZoneOption.textContent = 'This PC';
timeZoneSelect.appendChild(systemZoneOption);
let timeZoneNames = ['UTC', 'Europe/London', 'Europe/Belgrade', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo'];
try {if (Intl.supportedValuesOf) {timeZoneNames = Intl.supportedValuesOf('timeZone');}} catch (error) {}
timeZoneNames.forEach(function(name)
{
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  timeZoneSelect.appendChild(option);
});
timeZoneSelect.value = settings.timeZone;
if (timeZoneSelect.value !== settings.timeZone) {timeZoneSelect.value = 'system';}
timeZoneSelect.onchange = function() {setSetting('timeZone', timeZoneSelect.value);};
playerPage.appendChild(createSubtitleRow('Time zone', timeZoneSelect));
const autoTimeCheckbox = document.createElement('input');
autoTimeCheckbox.type = 'checkbox';
autoTimeCheckbox.checked = settings.autoTime !== false;
autoTimeCheckbox.onchange = function() {setSetting('autoTime', autoTimeCheckbox.checked);};
playerPage.appendChild(createSubtitleRow('Auto update time', autoTimeCheckbox));
//------ Frequency analyser ------
spectrumPage.appendChild(createSettingsHeading('Frequency analyser'));
const spectrumSettings = settings.spectrum;
function createSpectrumColor(labelText, key)
{
  const input = document.createElement('input');
  input.type = 'color';
  input.value = spectrumSettings[key];
  input.oninput = function() {spectrumSettings[key] = input.value; saveSettings();};
  spectrumPage.appendChild(createSubtitleRow(labelText, input));
}
createSpectrumColor('Bar color (bottom)', 'colorLow');
createSpectrumColor('Bar color (top)', 'colorHigh');
spectrumPage.appendChild(createSubtitleSlider('Glow', 0, 30, 1, spectrumSettings.glow, '', function(value) {spectrumSettings.glow = value;}));
const spectrumBandsSelect = document.createElement('select');
spectrumBandsSelect.style.width = '100px';
[48, 64, 96, 128, 192, 256].forEach(function(count)
{
  const option = document.createElement('option');
  option.value = count;
  option.textContent = count + ' bars';
  spectrumBandsSelect.appendChild(option);
});
spectrumBandsSelect.value = spectrumSettings.bands;
spectrumBandsSelect.onchange = function() {spectrumSettings.bands = parseInt(spectrumBandsSelect.value, 10); saveSettings();};
spectrumPage.appendChild(createSubtitleRow('Detail', spectrumBandsSelect));
const spectrumTypeSelect = document.createElement('select');
spectrumTypeSelect.style.width = '150px';
[['bars', 'Bars'], ['merged', 'Merged bars (no gaps)'], ['line', 'Line'], ['smoothLine', 'Smooth line'], ['area', 'Filled'], ['smoothArea', 'Filled smooth']].forEach(function(item)
{
  const option = document.createElement('option');
  option.value = item[0];
  option.textContent = item[1];
  spectrumTypeSelect.appendChild(option);
});
spectrumTypeSelect.value = spectrumSettings.type;
spectrumTypeSelect.onchange = function() {spectrumSettings.type = spectrumTypeSelect.value; saveSettings();};
spectrumPage.appendChild(createSubtitleRow('Graph type', spectrumTypeSelect));
spectrumPage.appendChild(createSubtitleSlider('Bar gap', 0, 6, 1, spectrumSettings.barGap, 'px', function(value) {spectrumSettings.barGap = value;}));
spectrumPage.appendChild(createSubtitleSlider('Line width', 1, 6, 1, spectrumSettings.lineWidth, 'px', function(value) {spectrumSettings.lineWidth = value;}));
const spectrumPeaksCheckbox = document.createElement('input');
spectrumPeaksCheckbox.type = 'checkbox';
spectrumPeaksCheckbox.checked = spectrumSettings.peaks === true;
spectrumPeaksCheckbox.onchange = function() {spectrumSettings.peaks = spectrumPeaksCheckbox.checked; saveSettings();};
spectrumPage.appendChild(createSubtitleRow('Peak marks', spectrumPeaksCheckbox));
spectrumPage.appendChild(createSubtitleSlider('Top level', -40, 0, 5, spectrumSettings.maxDb, ' dB', function(value) {spectrumSettings.maxDb = value; applySpectrumSettings();}));
spectrumPage.appendChild(createSubtitleSlider('Bottom level', -120, -60, 5, spectrumSettings.minDb, ' dB', function(value) {spectrumSettings.minDb = value; applySpectrumSettings();}));
spectrumPage.appendChild(createSubtitleSlider('Smoothing', 0, 95, 5, spectrumSettings.smoothing, '%', function(value) {spectrumSettings.smoothing = value; applySpectrumSettings();}));
spectrumPage.appendChild(createSubtitleSlider('Grid lines', 0, 100, 10, spectrumSettings.grid, '%', function(value) {spectrumSettings.grid = value;}));
//------ Subtitles (controls are made in subtitles.js) ------
subtitlePage.appendChild(createSettingsHeading('Subtitles'));
subtitlePage.appendChild(subtitleSettingsContainer);

const settingsMenu = new SelectActionMenu("settingsMenuID", [], () => {
  console.log("Settings closed");
}, "Settings:", "Select", false, settingsContent);
settingsMenu.dialog.style.height = 'auto';
settingsMenu.dialog.style.width = '480px';
settingsMenu.dialog.style.maxWidth = 'calc(100vw - 20px)';
settingsMenu.dialog.style.flexWrap = 'nowrap';
settingsMenu.dialog.style.paddingBottom = '10px';
settingsMenu.onShow = function()
{
  refreshAudioDevices();
  settingsOpen = true;
  settingsTabDialog.style.display = 'flex';
  settingsBackdrop.style.display = 'block';
  settingsBackdrop.style.opacity = '0';
  void settingsBackdrop.offsetWidth; //So the fade starts from transparent
  updateSettingsBackdrop();
};
settingsMenu.onHide = function()
{
  settingsOpen = false;
  settingsTabDialog.style.display = 'none';
  settingsBackdrop.style.opacity = '0';
  setTimeout(function() {if (!settingsOpen) {settingsBackdrop.style.display = 'none';}}, 400);
};
//Restore saved audio options
if (settings.audioMono) {setAudioMono(true);}
if (settings.audioDevice) {setAudioDevice(settings.audioDevice);}
refreshAudioDevices();
showSettingsTab(settingsPages[settings.settingsTab] ? settings.settingsTab : 'audio');
