//Frequency (tone) generator window. The tone goes straight to the speakers (and to the frequency analyser, so you can see it).
const toneState = {frequency: 440, volume: 20, pan: 0, type: 'sine'};
let toneOscillator = null;
const toneGain = audioCtx.createGain();
toneGain.gain.value = 0;
const tonePanner = audioCtx.createStereoPanner();
toneGain.connect(tonePanner);
tonePanner.connect(audioCtx.destination);
tonePanner.connect(spectrumAnalyser);
function toneGainValue() {const level = toneState.volume / 100; return level * level * 0.5;} //Quadratic, so low volumes are really quiet

const toneContainer = document.createElement('div');
toneContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
const toneTitle = document.createElement('label');
toneTitle.innerText = 'Frequency generator:';
toneTitle.style.paddingBottom = '6px';
toneContainer.appendChild(toneTitle);

//Frequency: slider (20 Hz - 20 kHz, logarithmic) and a box where the exact Hz can be typed
const toneFrequencySlider = document.createElement('input');
toneFrequencySlider.type = 'range';
toneFrequencySlider.className = 'accentSlider';
toneFrequencySlider.min = 0;
toneFrequencySlider.max = 1000;
toneFrequencySlider.step = 1;
toneFrequencySlider.style.width = '170px';
const toneFrequencyInput = document.createElement('input');
toneFrequencyInput.type = 'number';
toneFrequencyInput.min = 1;
toneFrequencyInput.max = 20000;
toneFrequencyInput.step = 1;
toneFrequencyInput.style.width = '80px';
const toneHzLabel = document.createElement('span');
toneHzLabel.textContent = ' Hz';
const toneFrequencyBox = document.createElement('div');
toneFrequencyBox.appendChild(toneFrequencyInput);
toneFrequencyBox.appendChild(toneHzLabel);
function setToneFrequency(hz, fromInput)
{
  if (isNaN(hz)) {return;}
  hz = Math.min(20000, Math.max(1, hz));
  toneState.frequency = hz;
  toneFrequencySlider.value = Math.round(1000 * Math.log(Math.max(20, hz) / 20) / Math.log(1000));
  if (!fromInput) {toneFrequencyInput.value = Math.round(hz * 10) / 10;}
  if (toneOscillator) {toneOscillator.frequency.setTargetAtTime(hz, audioCtx.currentTime, 0.01);}
}
toneFrequencySlider.oninput = function() {setToneFrequency(20 * Math.pow(1000, parseInt(toneFrequencySlider.value, 10) / 1000), false);};
toneFrequencyInput.oninput = function() {setToneFrequency(parseFloat(toneFrequencyInput.value), true);};
toneContainer.appendChild(createSubtitleRow('Frequency', toneFrequencySlider));
toneContainer.appendChild(createSubtitleRow('', toneFrequencyBox));

//Waveform
const toneTypeSelect = document.createElement('select');
toneTypeSelect.style.width = '120px';
[['sine', 'Sine'], ['square', 'Square'], ['sawtooth', 'Sawtooth'], ['triangle', 'Triangle']].forEach(function(item)
{
  const option = document.createElement('option');
  option.value = item[0];
  option.textContent = item[1];
  toneTypeSelect.appendChild(option);
});
toneTypeSelect.onchange = function() {toneState.type = toneTypeSelect.value; if (toneOscillator) {toneOscillator.type = toneState.type;}};
toneContainer.appendChild(createSubtitleRow('Wave', toneTypeSelect));

//Balance (left - right) and volume
toneContainer.appendChild(createSubtitleSlider('Balance', -100, 100, 5, 0, '', function(value)
{
  toneState.pan = value / 100;
  tonePanner.pan.setTargetAtTime(toneState.pan, audioCtx.currentTime, 0.01);
}));
toneContainer.appendChild(createSubtitleSlider('Volume', 0, 100, 1, toneState.volume, '%', function(value)
{
  toneState.volume = value;
  if (toneOscillator) {toneGain.gain.setTargetAtTime(toneGainValue(), audioCtx.currentTime, 0.02);}
}));

//Start / stop
const toneButton = document.createElement('input');
toneButton.type = 'button';
toneButton.value = 'Start';
toneButton.style.cssText = 'height:40px;border-radius:10px;';
toneButton.onclick = function() {if (toneOscillator) {stopTone();} else {startTone();}};
const toneButtonBox = document.createElement('div');
toneButtonBox.appendChild(toneButton);

function startTone()
{
  resumeAudioContext();
  toneOscillator = audioCtx.createOscillator();
  toneOscillator.type = toneState.type;
  toneOscillator.frequency.value = toneState.frequency;
  toneOscillator.connect(toneGain);
  toneOscillator.start(0);
  toneGain.gain.setTargetAtTime(toneGainValue(), audioCtx.currentTime, 0.02);
  toneButton.value = 'Stop';
  const row = document.getElementById('toneRowID');
  if (row) {row.classList.add('selected');}
}
function stopTone()
{
  if (!toneOscillator) {return;}
  const oscillator = toneOscillator;
  toneOscillator = null;
  toneGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02); //Short fade, so it doesn't click
  setTimeout(function() {try {oscillator.stop(); oscillator.disconnect();} catch (error) {}}, 150);
  toneButton.value = 'Start';
  const row = document.getElementById('toneRowID');
  if (row) {row.classList.remove('selected');}
}
setToneFrequency(toneState.frequency, false);

const toneMenu = new SelectActionMenu("toneMenuID", [], () => {}, "Frequency generator:", "Select", false, toneContainer);
toneMenu.dialog.style.height = 'auto';
toneMenu.dialog.style.width = '440px';
toneMenu.dialog.style.paddingBottom = '10px';
//Start and Close side by side in the button row of the window
const toneButtonRow = toneMenu.dialog.lastChild;
toneButtonRow.insertBefore(toneButton, toneButtonRow.firstChild);
toneMenu.onHide = stopTone; //Closing the window stops the tone
