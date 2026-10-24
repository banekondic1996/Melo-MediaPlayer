//Frequency analyser: a blurred panel over the player (between top bar and bottom bar), frequencies along the bottom, dB on the right.
//Reads from spectrumAnalyser of the shared audio graph (audioEngine.js), so it works together with visualizer and equalizer.
//Buttons: Transparent/Background (see through, to use it as overlay on video) and X (close). The rest of the panel lets the mouse through.
//Colors, glow, number of bars, dB range, smoothing and grid brightness are in Settings (settings.spectrum).
const spectrumPanelEl = document.getElementById('spectrumPanelId');
const spectrumOverlayEl = document.getElementById('spectrumOverlayId');
const spectrumMinHz = 20;
const spectrumMaxHz = 20000;
//20 - 200 Hz is the most important part, so it gets 45% of the width instead of the 33% a plain log scale would give
const spectrumSplitHz = 200;
const spectrumSplitFraction = 0.45;
function spectrumFraction(hz)
{
  if (hz <= spectrumSplitHz) {return spectrumSplitFraction * Math.log(hz / spectrumMinHz) / Math.log(spectrumSplitHz / spectrumMinHz);}
  return spectrumSplitFraction + (1 - spectrumSplitFraction) * Math.log(hz / spectrumSplitHz) / Math.log(spectrumMaxHz / spectrumSplitHz);
}
function spectrumHzAt(fraction)
{
  if (fraction <= spectrumSplitFraction) {return spectrumMinHz * Math.pow(spectrumSplitHz / spectrumMinHz, fraction / spectrumSplitFraction);}
  return spectrumSplitHz * Math.pow(spectrumMaxHz / spectrumSplitHz, (fraction - spectrumSplitFraction) / (1 - spectrumSplitFraction));
}
//Marks on the frequency axis. tier 0 = most important number, 2 = least. A number is only written if it doesn't touch a more important one,
//so numbers never overlap at any window size. Every mark gets a tick under the graph, numbered ones a longer tick.
const spectrumTicks = [];
(function()
{
  const tier0 = [20, 50, 100, 200];
  const tier1 = [30, 40, 60, 80, 150];
  for (let hz = 20; hz <= 200; hz += 10) {spectrumTicks.push({hz: hz, label: String(hz), tier: tier0.includes(hz) ? 0 : (tier1.includes(hz) ? 1 : 2), shown: false});}
  [[250, '250', 2], [300, '300', 1], [400, '400', 2], [500, '500', 0], [600, '600', 2], [700, '700', 2], [800, '800', 2], [900, '900', 2],
   [1000, '1k', 0], [2000, '2k', 1], [3000, '3k', 2], [4000, '4k', 2], [5000, '5k', 0], [6000, '6k', 2], [7000, '7k', 2], [8000, '8k', 2], [9000, '9k', 2],
   [10000, '10k', 0], [15000, '15k', 2], [20000, '20k', 0]].forEach(function(t) {spectrumTicks.push({hz: t[0], label: t[1], tier: t[2], shown: false});});
  //Small ticks (no number) so every 100 Hz up to 10k, every 1k up to 20k and every 50 Hz from 200 to 1k is marked
  const known = spectrumTicks.map(function(t) {return t.hz;});
  const addMinor = function(hz) {if (!known.includes(hz)) {known.push(hz); spectrumTicks.push({hz: hz, label: '', tier: 3, shown: false});}};
  for (let hz = 250; hz < 1000; hz += 50) {addMinor(hz);}
  for (let hz = 1000; hz < 10000; hz += 100) {addMinor(hz);}
  for (let hz = 10000; hz < 20000; hz += 1000) {addMinor(hz);}
  spectrumTicks.sort(function(a, b) {return a.hz - b.hz;});
})();
spectrumAnalyser.fftSize = 16384; // More detail for the low frequencies. Must be set BEFORE the data array is made (it was the wrong way round: the array only held half of the bins, so every frequency showed twice too high)
const spectrumData = new Float32Array(spectrumAnalyser.frequencyBinCount);
let spectrumFrame = null;
let spectrumOn = false;
let spectrumPeaks = [];
let spectrumDrawn = false;
function toneIsPlaying() {return (typeof toneOscillator !== 'undefined') && toneOscillator !== null;}
//Apply dB range and smoothing from settings (called at start and when changed in Settings)
function applySpectrumSettings()
{
  const s = settings.spectrum;
  try
  {
    spectrumAnalyser.minDecibels = s.minDb;
    spectrumAnalyser.maxDecibels = s.maxDb;
    spectrumAnalyser.smoothingTimeConstant = s.smoothing / 100;
  }
  catch (error) {console.log("Spectrum settings: " + error.message);}
}
applySpectrumSettings();
//#rrggbb -> rgba()
function spectrumRgba(hex, alpha)
{
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {hex = '#00ff8c';}
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
}

function drawSpectrum()
{
  spectrumFrame = requestAnimationFrame(drawSpectrum);
  const cssWidth = spectrumOverlayEl.clientWidth;
  const cssHeight = spectrumOverlayEl.clientHeight;
  if (!cssWidth || !cssHeight) {return;}
  const ratio = window.devicePixelRatio || 1;
  if (spectrumOverlayEl.width !== Math.round(cssWidth * ratio) || spectrumOverlayEl.height !== Math.round(cssHeight * ratio))
  {
    spectrumOverlayEl.width = Math.round(cssWidth * ratio);
    spectrumOverlayEl.height = Math.round(cssHeight * ratio);
  }
  const s = settings.spectrum;
  if (s.freezeOnPause && audioVideoElement.paused && !toneIsPlaying() && spectrumDrawn) {return;} //Graph stays as it was when the audio paused
  const ctx = spectrumOverlayEl.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  spectrumAnalyser.getFloatFrequencyData(spectrumData);
  //Padding around the graph. Top has room for the buttons, bottom for ticks and numbers
  const left = 28;
  const right = 68;
  const top = 48;
  const bottom = 40;
  const plotWidth = cssWidth - left - right;
  const plotHeight = cssHeight - top - bottom;
  if (plotWidth < 50 || plotHeight < 30) {return;}
  //Dark text on the light panel, white text in dark mode or when the background is transparent (over video)
  const lightPanel = !darkMode && !spectrumPanelEl.classList.contains('spectrumClear');
  const textColor = lightPanel ? 'rgba(20,20,20,0.9)' : 'rgba(255,255,255,0.92)';
  const lineColor = lightPanel ? '20,20,20' : '255,255,255';
  const textShadow = lightPanel ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.7)';
  const gridK = s.grid / 100;
  const xOf = function(hz) {return left + plotWidth * spectrumFraction(hz);};
  const bottomY = top + plotHeight;
  ctx.font = '11px arial';
  ctx.shadowBlur = 0;
  //Decide which numbers fit (most important first)
  spectrumTicks.forEach(function(tick) {tick.shown = false;});
  const placed = [];
  [0, 1, 2].forEach(function(tier)
  {
    spectrumTicks.forEach(function(tick)
    {
      if (tick.tier !== tier) {return;}
      const x = xOf(tick.hz);
      const width = ctx.measureText(tick.label).width + 8;
      if (placed.every(function(other) {return Math.abs(other.x - x) >= (other.width + width) / 2;}))
      {
        placed.push({x: x, width: width});
        tick.shown = true;
      }
    });
  });
  //Vertical grid lines
  ctx.lineWidth = 1;
  //Small ticks are only drawn when there is room (at least 6 px from the previous mark), so high frequencies don't get too dense
  let lastMarkX = -100;
  spectrumTicks.forEach(function(tick)
  {
    const markX = xOf(tick.hz);
    tick.draw = tick.tier < 3 || markX - lastMarkX >= 6;
    if (tick.draw) {lastMarkX = markX;}
  });
  spectrumTicks.forEach(function(tick)
  {
    if (!tick.draw) {return;}
    const x = Math.round(xOf(tick.hz)) + 0.5;
    ctx.strokeStyle = 'rgba(' + lineColor + ',' + ((tick.shown ? 0.24 : (tick.tier === 3 ? 0.05 : 0.1)) * gridK) + ')';
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottomY); ctx.stroke();
  });
  //dB lines and numbers on the right
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const dbStep = (s.maxDb - s.minDb) > 70 ? 20 : 10;
  for (let db = s.maxDb; db >= s.minDb; db -= dbStep)
  {
    const y = top + plotHeight * (s.maxDb - db) / (s.maxDb - s.minDb);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(' + lineColor + ',' + (0.22 * gridK) + ')';
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + plotWidth, y); ctx.stroke();
    ctx.shadowColor = textShadow;
    ctx.shadowBlur = 3;
    ctx.fillStyle = textColor;
    ctx.fillText(db + ' dB', left + plotWidth + 8, y);
  }
  //Level (0 - 1) of every band
  const bands = s.bands;
  const binHz = (audioCtx.sampleRate / 2) / spectrumData.length;
  const barWidth = plotWidth / bands;
  const levels = new Array(bands);
  for (let band = 0; band < bands; band++)
  {
    const lowHz = spectrumHzAt(band / bands);
    const highHz = spectrumHzAt((band + 1) / bands);
    const firstBin = Math.min(spectrumData.length - 1, Math.max(0, Math.floor(lowHz / binHz)));
    const lastBin = Math.min(spectrumData.length - 1, Math.max(firstBin, Math.ceil(highHz / binHz)));
    let peak = -Infinity;
    for (let bin = firstBin; bin <= lastBin; bin++) {if (spectrumData[bin] > peak) {peak = spectrumData[bin];}}
    levels[band] = Math.min(1, Math.max(0, (peak - s.minDb) / (s.maxDb - s.minDb)));
  }
  //Graph with optional glow. One path, so the glow is drawn once
  const gradient = ctx.createLinearGradient(0, bottomY, 0, top);
  gradient.addColorStop(0, spectrumRgba(s.colorLow, 1));
  gradient.addColorStop(1, spectrumRgba(s.colorHigh, 1));
  ctx.fillStyle = gradient;
  ctx.strokeStyle = gradient;
  ctx.lineJoin = 'round';
  ctx.shadowColor = spectrumRgba(s.colorHigh, 0.95);
  ctx.shadowBlur = s.glow;
  const type = s.type;
  ctx.beginPath();
  if (type === 'bars' || type === 'merged')
  {
    const gap = type === 'merged' ? 0 : Math.max(0, s.barGap);
    for (let band = 0; band < bands; band++)
    {
      const barHeight = levels[band] * plotHeight;
      if (barHeight > 0.5) {ctx.rect(left + band * barWidth + gap / 2, bottomY - barHeight, Math.max(1, barWidth - gap), barHeight);}
    }
    ctx.fill();
  }
  else
  {
    const smooth = (type === 'smoothLine' || type === 'smoothArea');
    const filled = (type === 'area' || type === 'smoothArea');
    const points = levels.map(function(level, index) {return {x: left + (index + 0.5) * barWidth, y: bottomY - level * plotHeight};});
    ctx.moveTo(left, bottomY - levels[0] * plotHeight);
    ctx.lineTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++)
    {
      if (smooth) {ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, (points[i - 1].x + points[i].x) / 2, (points[i - 1].y + points[i].y) / 2);}
      else {ctx.lineTo(points[i].x, points[i].y);}
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(left + plotWidth, points[points.length - 1].y);
    if (filled) {ctx.lineTo(left + plotWidth, bottomY); ctx.lineTo(left, bottomY); ctx.closePath(); ctx.fill();}
    else {ctx.lineWidth = s.lineWidth; ctx.stroke();}
  }
  //Peak hold: small marks that fall slowly
  if (s.peaks)
  {
    if (spectrumPeaks.length !== bands) {spectrumPeaks = new Array(bands).fill(0);}
    ctx.shadowBlur = 0;
    ctx.strokeStyle = spectrumRgba(s.colorHigh, 1);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let band = 0; band < bands; band++)
    {
      spectrumPeaks[band] = Math.max(levels[band], spectrumPeaks[band] - 0.004);
      const y = bottomY - spectrumPeaks[band] * plotHeight;
      ctx.moveTo(left + band * barWidth, y); ctx.lineTo(left + (band + 1) * barWidth, y);
    }
    ctx.stroke();
  }
  //Axis line and clearly visible ticks under the graph
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(' + lineColor + ',0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(left, bottomY + 0.5); ctx.lineTo(left + plotWidth, bottomY + 0.5); ctx.stroke();
  spectrumTicks.forEach(function(tick)
  {
    if (!tick.draw) {return;}
    const x = Math.round(xOf(tick.hz)) + 0.5;
    ctx.lineWidth = tick.shown ? 2 : 1;
    ctx.strokeStyle = 'rgba(' + lineColor + ',' + (tick.shown ? 0.95 : 0.8) + ')';
    ctx.beginPath(); ctx.moveTo(x, bottomY); ctx.lineTo(x, bottomY + (tick.shown ? 10 : (tick.tier === 3 ? 5 : 7))); ctx.stroke();
  });
  //Frequency numbers
  ctx.shadowColor = textShadow;
  ctx.shadowBlur = 3;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  spectrumTicks.forEach(function(tick)
  {
    if (tick.shown) {ctx.fillText(tick.label, xOf(tick.hz), bottomY + 24);}
  });
  ctx.shadowBlur = 0;
  spectrumDrawn = true;
}
//Options > Frequency analyser (and the X button): switch on/off
function toggleSpectrum()
{
  spectrumOn = !spectrumOn;
  const row = document.getElementById('spectrumRowID');
  if (spectrumOn)
  {
    spectrumPanelEl.classList.remove('hide');
    if (row) {row.classList.add('selected');}
    if (spectrumFrame === null) {drawSpectrum();}
  }
  else
  {
    spectrumPanelEl.classList.add('hide');
    if (row) {row.classList.remove('selected');}
    if (spectrumFrame !== null) {cancelAnimationFrame(spectrumFrame); spectrumFrame = null;}
  }
}
//Transparent background button, so the analyser can be used as an overlay on video
function toggleSpectrumBackground()
{
  const clear = spectrumPanelEl.classList.toggle('spectrumClear');
  document.getElementById('spectrumClearBtnId').value = clear ? 'Background' : 'Transparent';
}
