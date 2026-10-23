//Equalizer window. Uses the equalizer filters of the shared audio graph (audioEngine.js), so it works together with the visualizer and frequency analyser.
const eqPresets = {
  'Flat':         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass boost':   [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  'Treble boost': [0, 0, 0, 0, 0, 0, 2, 4, 5, 6],
  'Vocal':        [-2, -2, -1, 1, 3, 3, 2, 1, 0, -1],
  'Rock':         [4, 3, 1, -1, -2, -1, 2, 3, 4, 4],
  'Ideapad 3':    [0, 0, 0, 0, 0, 1.5, 2.5, 4.5, 6, 9]
};
const eqLabels = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
const eqSliders = [];

const eqContainer = document.createElement('div');
eqContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

const eqTitle = document.createElement('label');
eqTitle.innerText = 'Equalizer:';
eqTitle.style.paddingBottom = '2px';
eqContainer.appendChild(eqTitle);

//Preset list
const eqPresetSelect = document.createElement('select');
eqPresetSelect.id = 'eqPresetSelectID';
eqPresetSelect.style.cssText = 'width:150px;height:40px;margin-bottom:10px;border-radius:5px;';
const eqCustomOption = document.createElement('option');
eqCustomOption.value = 'Custom';
eqCustomOption.textContent = 'Custom';
eqPresetSelect.appendChild(eqCustomOption);
Object.keys(eqPresets).forEach(function(name)
{
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  eqPresetSelect.appendChild(option);
});
eqContainer.appendChild(eqPresetSelect);

//One vertical slider per band
const eqBands = document.createElement('div');
eqBands.style.cssText = 'display:flex;flex-direction:row;justify-content:center;';
eqFrequencies.forEach(function(frequency, index)
{
  const band = document.createElement('div');
  band.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:26px;';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'accentSlider';
  slider.min = -12;
  slider.max = 12;
  slider.step = 0.5;
  slider.value = 0;
  slider.title = eqLabels[index] + ' Hz';
  slider.style.cssText = 'writing-mode:vertical-lr;direction:rtl;height:110px;width:18px;margin:0px;';
  slider.oninput = function()
  {
    const gain = parseFloat(slider.value);
    setEqBand(index, gain);
    slider.title = eqLabels[index] + ' Hz: ' + gain + ' dB';
    settings.eqGains[index] = gain;
    saveSettings();
    updateEqPresetSelect();
  };
  const label = document.createElement('div');
  label.textContent = eqLabels[index];
  label.style.cssText = 'font-size:10px;padding-top:4px;';
  band.appendChild(slider);
  band.appendChild(label);
  eqBands.appendChild(band);
  eqSliders.push(slider);
});
eqContainer.appendChild(eqBands);

//Show the preset name when the sliders match one, otherwise "Custom"
function updateEqPresetSelect()
{
  let found = 'Custom';
  Object.keys(eqPresets).forEach(function(name)
  {
    if (eqPresets[name].every(function(gain, index) {return gain === settings.eqGains[index];})) {found = name;}
  });
  eqPresetSelect.value = found;
}
//Put given gains on sliders and on the audio filters
function applyEqGains(gains)
{
  settings.eqGains = gains.slice();
  gains.forEach(function(gain, index)
  {
    eqSliders[index].value = gain;
    eqSliders[index].title = eqLabels[index] + ' Hz: ' + gain + ' dB';
    setEqBand(index, gain);
  });
  saveSettings();
  updateEqPresetSelect();
}
eqPresetSelect.onchange = function()
{
  if (eqPresets[eqPresetSelect.value]) {applyEqGains(eqPresets[eqPresetSelect.value]);}
};

const eqMenu = new SelectActionMenu("equalizerMenuID", [], () => {
  console.log("Equalizer applied");
}, "Equalizer:", "Select", false, eqContainer);
eqMenu.dialog.style.height = 'auto';
eqMenu.dialog.style.width = '320px';
eqMenu.dialog.style.paddingBottom = '10px';

//Restore saved equalizer
applyEqGains(settings.eqGains);
