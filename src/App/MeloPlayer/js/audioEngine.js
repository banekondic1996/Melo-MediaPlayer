//One shared audio graph for everything that needs the sound: equalizer, visualizer, frequency analyser and mute.
//createMediaElementSource() can only be called ONCE per element, so every feature taps into this graph instead of making its own.
//
//  video/audio element -> equalizer filters -> analyser (visualizer) -> master gain (mute) -> speakers
//                                                    \-> spectrumAnalyser (frequency analyser window)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sourceNode = audioCtx.createMediaElementSource(audioVideoElement);

//10 band equalizer. First band is a low shelf, last is a high shelf, the rest are peaking filters
const eqFrequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const eqFilters = eqFrequencies.map(function(frequency, index)
{
  const filter = audioCtx.createBiquadFilter();
  if (index === 0) {filter.type = 'lowshelf';}
  else if (index === eqFrequencies.length - 1) {filter.type = 'highshelf';}
  else {filter.type = 'peaking';}
  filter.frequency.value = frequency;
  filter.Q.value = 1.4;
  filter.gain.value = 0;
  return filter;
});

//Analyser used by the visualizer
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256; // Controls the frequency resolution
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

//Analyser used by the frequency analyser window (more detail, so it has its own)
const spectrumAnalyser = audioCtx.createAnalyser();
spectrumAnalyser.fftSize = 4096;
spectrumAnalyser.smoothingTimeConstant = 0.8;

//Mute lives AFTER the analysers, so the visualizer keeps moving while muted
const masterGain = audioCtx.createGain();

let previousNode = sourceNode;
eqFilters.forEach(function(filter) {previousNode.connect(filter); previousNode = filter;});
//Stereo / mono switch (Settings > Audio): a node forced to 1 channel mixes left and right together
const channelNode = audioCtx.createGain();
channelNode.channelCountMode = 'explicit';
channelNode.channelInterpretation = 'speakers';
channelNode.channelCount = 2;
previousNode.connect(channelNode);
channelNode.connect(analyser);
analyser.connect(masterGain);
masterGain.connect(audioCtx.destination);
analyser.connect(spectrumAnalyser);

//Mono on/off
function setAudioMono(state)
{
  channelNode.channelCount = state ? 1 : 2;
  setSetting('audioMono', !!state);
}
//Choose audio output device ('' = system default)
function setAudioDevice(deviceId)
{
  if (typeof audioCtx.setSinkId !== 'function') {console.log("This version can't change audio output"); return;}
  audioCtx.setSinkId(deviceId || '').then(function() {setSetting('audioDevice', deviceId || '');}).catch(function(error)
  {
    console.log("Could not use audio device: " + error.message);
    setSetting('audioDevice', '');
  });
}
//Set gain (dB) of one equalizer band
function setEqBand(index, gain) {eqFilters[index].gain.value = gain;}

//Browsers keep an AudioContext suspended until the user interacts, and a suspended context freezes the media element
function resumeAudioContext()
{
  if (audioCtx.state !== 'running') {audioCtx.resume().catch(function() {});}
}
['click', 'keydown', 'mousedown'].forEach(function(eventName) {document.addEventListener(eventName, resumeAudioContext);});

//Mute / unmute (speaker icon)
let isMuted = false;
function setMuted(state)
{
  isMuted = state;
  masterGain.gain.setTargetAtTime(state ? 0 : 1, audioCtx.currentTime, 0.015);
  const icon = document.getElementById('volumeIconId');
  if (icon) {icon.style.opacity = state ? '0.4' : '';}
}
function toggleMute() {setMuted(!isMuted);}
