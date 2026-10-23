//Subtitles for video. Add .srt / .vtt files and change how they look.
//Text is drawn in our own overlay (subtitleOverlayID) so size, color, position and delay can all be changed freely.
let subtitleCues = [];
let subtitleRaw = null;       // Raw bytes of the loaded file, kept so the encoding can be changed later
let subtitleFileName = '';
let subtitleTimer = null;
let subtitleShownCue = null;
const subtitleOverlayEl = document.getElementById('subtitleOverlayID');
const subtitleTextEl = document.getElementById('subtitleTextID');

//Read "00:01:02,500" / "01:02.500" into seconds
function parseSubtitleTime(text)
{
  const match = text.trim().match(/^(?:(\d+):)?(\d+):(\d+)[.,](\d+)/);
  if (!match) {return NaN;}
  return parseInt(match[1] || 0, 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10) + parseInt(match[4].padEnd(3, '0').slice(0, 3), 10) / 1000;
}
//Keep only plain <i> <b> <u>, everything else is shown as text so nothing from the file can run as HTML
function cleanSubtitleText(text)
{
  return text
  .replace(/\{[^}]*\}/g, '')
  .replace(/<(?!\/?(?:i|b|u)>)[^>]*>/gi, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/&lt;(\/?)(i|b|u)&gt;/gi, '<$1$2>');
}
//Parse .srt or .vtt text into a list of {start, end, text}
function parseSubtitles(text)
{
  const lines = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const cues = [];
  for (let i = 0; i < lines.length; i++)
  {
    if (lines[i].indexOf('-->') === -1) {continue;}
    const parts = lines[i].split('-->');
    const start = parseSubtitleTime(parts[0]);
    const end = parseSubtitleTime(parts[1].trim().split(/\s+/)[0]); // .vtt can have cue settings after the end time
    if (isNaN(start) || isNaN(end)) {continue;}
    const textLines = [];
    i++;
    while (i < lines.length && lines[i].trim() !== '') {textLines.push(lines[i]); i++;}
    if (textLines.length > 0) {cues.push({start: start, end: end, text: cleanSubtitleText(textLines.join('\n'))});}
  }
  cues.sort(function(a, b) {return a.start - b.start;});
  return cues;
}
//Subtitle files are often not UTF-8 (for example Windows-1250), auto tries UTF-8 first
function decodeSubtitleBuffer(buffer, encoding)
{
  if (encoding === 'auto')
  {
    try {return new TextDecoder('utf-8', {fatal: true}).decode(buffer);}
    catch (error) {return new TextDecoder('windows-1250').decode(buffer);}
  }
  return new TextDecoder(encoding).decode(buffer);
}

//Show the cue that belongs to the current video time
function updateSubtitleDisplay()
{
  if (subtitleCues.length === 0) {return;}
  const time = audioVideoElement.currentTime - settings.subtitle.delay;
  let low = 0;
  let high = subtitleCues.length - 1;
  let index = -1;
  while (low <= high)
  {
    const middle = (low + high) >> 1;
    if (subtitleCues[middle].start <= time) {index = middle; low = middle + 1;}
    else {high = middle - 1;}
  }
  let active = null;
  for (let k = index; k >= 0 && k > index - 3; k--) // Look back a bit for cues that overlap
  {
    if (time < subtitleCues[k].end) {active = subtitleCues[k]; break;}
  }
  if (active === subtitleShownCue) {return;}
  subtitleShownCue = active;
  if (active) {subtitleTextEl.innerHTML = active.text; subtitleTextEl.classList.remove('hide');}
  else {subtitleTextEl.classList.add('hide'); subtitleTextEl.innerHTML = '';}
}
function applySubtitleStyle()
{
  const s = settings.subtitle;
  subtitleOverlayEl.style.bottom = s.bottom + '%';
  subtitleTextEl.style.fontSize = s.size + 'px';
  subtitleTextEl.style.color = s.color;
  subtitleTextEl.style.backgroundColor = 'rgba(0,0,0,' + (s.bgOpacity / 100) + ')';
}
//Parse the stored file with the chosen encoding and start showing it
function applySubtitleData()
{
  if (!subtitleRaw) {return false;}
  const cues = parseSubtitles(decodeSubtitleBuffer(subtitleRaw, settings.subtitle.encoding));
  if (cues.length === 0) {customAlert('No subtitles found in this file'); return false;}
  subtitleCues = cues;
  subtitleShownCue = null;
  if (subtitleTimer === null) {subtitleTimer = setInterval(updateSubtitleDisplay, 100);}
  updateSubtitleStatus();
  updateSubtitleDisplay();
  return true;
}
//Remove subtitles (also called when another track is loaded)
function clearSubtitles()
{
  subtitleCues = [];
  subtitleRaw = null;
  subtitleFileName = '';
  subtitleShownCue = null;
  clearInterval(subtitleTimer);
  subtitleTimer = null;
  subtitleTextEl.classList.add('hide');
  subtitleTextEl.innerHTML = '';
  updateSubtitleStatus();
}
//Called by the hidden file input in the menu
function loadSubtitleFile(input)
{
  const file = input.files[0];
  if (!file) {return;}
  if (!/\.(srt|vtt)$/i.test(file.name)) {customAlert('Only .srt and .vtt subtitles are supported'); input.value = ''; return;}
  file.arrayBuffer().then(function(buffer)
  {
    const previousRaw = subtitleRaw;
    const previousName = subtitleFileName;
    subtitleRaw = buffer;
    subtitleFileName = file.name;
    if (!applySubtitleData()) {subtitleRaw = previousRaw; subtitleFileName = previousName;}
    input.value = '';
  });
}

//------------- Subtitle settings window -------------
function createSubtitleRow(labelText, control)
{
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:380px;margin:3px 0px;';
  const label = document.createElement('label');
  label.innerText = labelText;
  row.appendChild(label);
  row.appendChild(control);
  return row;
}
function createSubtitleSlider(name, min, max, step, value, unit, onChange)
{
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'accentSlider';
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = value;
  slider.style.width = '120px';
  const row = createSubtitleRow('', slider);
  const label = row.children[0];
  label.style.minWidth = '100px';
  const refresh = function() {label.innerText = name + ': ' + slider.value + unit;};
  slider.oninput = function() {refresh(); onChange(parseFloat(slider.value)); saveSettings();};
  refresh();
  return row;
}

const subtitleSettingsContainer = document.createElement('div');
subtitleSettingsContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
const subtitleTitle = document.createElement('label');
subtitleTitle.innerText = '';
subtitleTitle.style.paddingBottom = '2px';
const subtitleStatusEl = document.createElement('div');
subtitleStatusEl.style.cssText = 'width:380px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:0.7;padding-bottom:6px;';
function updateSubtitleStatus() {subtitleStatusEl.textContent = subtitleFileName ? subtitleFileName : 'No subtitles loaded';}
updateSubtitleStatus();
subtitleSettingsContainer.appendChild(subtitleStatusEl);

subtitleSettingsContainer.appendChild(createSubtitleSlider('Size', 12, 72, 1, settings.subtitle.size, 'px', function(value) {settings.subtitle.size = value; applySubtitleStyle();}));
const subtitleColorInput = document.createElement('input');
subtitleColorInput.type = 'color';
subtitleColorInput.value = settings.subtitle.color;
subtitleColorInput.oninput = function() {settings.subtitle.color = subtitleColorInput.value; applySubtitleStyle(); saveSettings();};
subtitleSettingsContainer.appendChild(createSubtitleRow('Color', subtitleColorInput));
subtitleSettingsContainer.appendChild(createSubtitleSlider('Background', 0, 100, 5, settings.subtitle.bgOpacity, '%', function(value) {settings.subtitle.bgOpacity = value; applySubtitleStyle();}));
subtitleSettingsContainer.appendChild(createSubtitleSlider('Height', 0, 40, 1, settings.subtitle.bottom, '%', function(value) {settings.subtitle.bottom = value; applySubtitleStyle();}));
const subtitleDelayInput = document.createElement('input');
subtitleDelayInput.type = 'number';
subtitleDelayInput.step = 0.1;
subtitleDelayInput.min = -60;
subtitleDelayInput.max = 60;
subtitleDelayInput.value = settings.subtitle.delay;
subtitleDelayInput.style.width = '70px';
subtitleDelayInput.oninput = function()
{
  const value = parseFloat(subtitleDelayInput.value);
  settings.subtitle.delay = isNaN(value) ? 0 : value;
  subtitleShownCue = null;
  updateSubtitleDisplay();
  saveSettings();
};
subtitleSettingsContainer.appendChild(createSubtitleRow('Delay (sec)', subtitleDelayInput));
const subtitleEncodingSelect = document.createElement('select');
[['auto', 'Auto'], ['utf-8', 'UTF-8'], ['windows-1250', 'Windows-1250 (Central Europe)'], ['windows-1251', 'Windows-1251 (Cyrillic)'], ['windows-1252', 'Windows-1252 (Western)']].forEach(function(item)
{
  const option = document.createElement('option');
  option.value = item[0];
  option.textContent = item[1];
  subtitleEncodingSelect.appendChild(option);
});
subtitleEncodingSelect.value = settings.subtitle.encoding;
subtitleEncodingSelect.style.width = '150px';
subtitleEncodingSelect.onchange = function()
{
  settings.subtitle.encoding = subtitleEncodingSelect.value;
  saveSettings();
  applySubtitleData();
};
subtitleSettingsContainer.appendChild(createSubtitleRow('Encoding', subtitleEncodingSelect));

const subtitleButtons = document.createElement('div');
subtitleButtons.style.cssText = 'text-align:center;';
const subtitleAddButton = document.createElement('input');
subtitleAddButton.type = 'button';
subtitleAddButton.value = 'Add file';
subtitleAddButton.style.cssText = 'height:40px;border-radius:10px;';
subtitleAddButton.onclick = function() {openFileDialog(document.getElementById('subtitleFileID'));};
const subtitleRemoveButton = document.createElement('input');
subtitleRemoveButton.type = 'button';
subtitleRemoveButton.value = 'Remove';
subtitleRemoveButton.style.cssText = 'height:40px;border-radius:10px;';
subtitleRemoveButton.onclick = function() {clearSubtitles();};
subtitleButtons.appendChild(subtitleAddButton);
subtitleButtons.appendChild(subtitleRemoveButton);
subtitleSettingsContainer.appendChild(subtitleButtons);



applySubtitleStyle();
