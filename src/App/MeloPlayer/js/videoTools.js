//Video tools: notification toast, screenshot (S key), video picture filters (Settings > Video) and the Transform window (zoom, rotate, move).

//------------- Fading notification inside the player -------------
const toastEl = document.createElement('div');
toastEl.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);padding:8px 18px;border-radius:15px;background:var(--alertBackground);color:white;z-index:9000;opacity:0;transition:opacity 0.4s;pointer-events:none;';
document.body.appendChild(toastEl);
let toastTimer = null;
function showToast(text)
{
  toastEl.textContent = text;
  toastEl.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() {toastEl.style.opacity = '0';}, 1500);
}

//------------- Screenshot -------------
function takeScreenshot()
{
  if (videoContainerElement.style.display !== 'block' || audioVideoElement.readyState < 2 || !audioVideoElement.videoWidth) {return;}
  try
  {
    const canvas = document.createElement('canvas');
    canvas.width = audioVideoElement.videoWidth;
    canvas.height = audioVideoElement.videoHeight;
    const context = canvas.getContext('2d');
    if (audioVideoElement.style.filter) {context.filter = audioVideoElement.style.filter;} //Brightness etc. from Settings > Video
    context.drawImage(audioVideoElement, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(function(blob)
    {
      if (!blob) {showToast('Screenshot failed'); return;}
      blob.arrayBuffer().then(function(buffer)
      {
        const os = require('os');
        let folder = nodePath.join(os.homedir(), 'Pictures');
        try {fs.mkdirSync(folder, {recursive: true});} catch (error) {folder = os.homedir();}
        const stamp = new Date().toISOString().replace(/[:T]/g, '-').substring(0, 19);
        const track = track_list[track_index];
        const baseName = (track ? track.name : 'Melo').replace(/[\\/:*?"<>|]/g, '_');
        const file = nodePath.join(folder, baseName + '_' + stamp + '.png');
        fs.writeFile(file, Buffer.from(buffer), function(error)
        {
          if (error) {console.log("Screenshot save failed: " + error.message); showToast('Screenshot failed'); return;}
          console.log("Screenshot saved: " + file);
          showToast('Screenshot taken');
        });
      });
    }, 'image/png');
  }
  catch (error) {console.log("Screenshot failed: " + error.message); showToast('Screenshot failed');}
}
document.addEventListener('keydown', function(event)
{
  if (event.code !== 'KeyS' || event.ctrlKey || event.altKey || event.metaKey) {return;}
  const tag = event.target && event.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {return;}
  takeScreenshot();
});

//------------- Picture filters (brightness, contrast, saturation, sharpness) -------------
//Sharpness has no CSS filter, so a small SVG filter (convolution) is used for it
const svgNamespace = 'http://www.w3.org/2000/svg';
const sharpenSvg = document.createElementNS(svgNamespace, 'svg');
sharpenSvg.setAttribute('width', '0');
sharpenSvg.setAttribute('height', '0');
sharpenSvg.style.position = 'absolute';
const sharpenFilter = document.createElementNS(svgNamespace, 'filter');
sharpenFilter.setAttribute('id', 'meloSharpen');
sharpenFilter.setAttribute('color-interpolation-filters', 'sRGB');
const sharpenMatrix = document.createElementNS(svgNamespace, 'feConvolveMatrix');
sharpenMatrix.setAttribute('order', '3');
sharpenMatrix.setAttribute('preserveAlpha', 'true');
sharpenMatrix.setAttribute('kernelMatrix', '0 0 0 0 1 0 0 0 0');
sharpenFilter.appendChild(sharpenMatrix);
sharpenSvg.appendChild(sharpenFilter);
document.body.appendChild(sharpenSvg);
function applyVideoFilter()
{
  const f = settings.videoFilter;
  const parts = [];
  if (f.sharpness > 0)
  {
    const amount = f.sharpness / 100 * 1.5;
    sharpenMatrix.setAttribute('kernelMatrix', '0 ' + (-amount) + ' 0 ' + (-amount) + ' ' + (1 + 4 * amount) + ' ' + (-amount) + ' 0 ' + (-amount) + ' 0');
    parts.push('url(#meloSharpen)');
  }
  if (f.brightness !== 100) {parts.push('brightness(' + f.brightness / 100 + ')');}
  if (f.contrast !== 100) {parts.push('contrast(' + f.contrast / 100 + ')');}
  if (f.saturation !== 100) {parts.push('saturate(' + f.saturation / 100 + ')');}
  audioVideoElement.style.filter = parts.join(' ');
}
function resetVideoFilter()
{
  settings.videoFilter = {brightness: 100, contrast: 100, saturation: 100, sharpness: 0};
  saveSettings();
  applyVideoFilter();
}
applyVideoFilter();

//------------- Transform window: zoom, rotate, move -------------
const transformState = Object.assign({x: 0, y: 0, zoom: 1, rot: 0}, settings.videoTransform);
function applyVideoTransform()
{
  const rect = videoContainerElement.getBoundingClientRect();
  let fit = 1; //Turned sideways, the picture is scaled down so it still fits
  if (transformState.rot % 180 !== 0 && rect.width > 0 && rect.height > 0) {fit = Math.min(rect.width / rect.height, rect.height / rect.width);}
  audioVideoElement.style.transformOrigin = 'center center';
  audioVideoElement.style.transform = 'translate(' + transformState.x + 'px, ' + transformState.y + 'px) rotate(' + transformState.rot + 'deg) scale(' + (transformState.zoom * fit) + ')';
  videoContainerElement.style.background = 'black'; //Black behind the picture, always
}
audioVideoElement.addEventListener('loadedmetadata', applyVideoTransform);
window.addEventListener('resize', applyVideoTransform);

const transformDialogEl = document.createElement('div');
transformDialogEl.className = 'inputDialog';
transformDialogEl.id = 'transformDialogID';
transformDialogEl.style.cssText = 'z-index:1002;position-area:none;position:fixed;top:12px;left:50%;transform:translateX(-50%);margin:0px;height:auto;width:auto;max-width:calc(100vw - 20px);padding:6px 10px;flex-direction:row;flex-wrap:wrap;justify-content:center;';
const transformButtons = {};
function createTransformButton(key, text, onClick)
{
  const button = document.createElement('input');
  button.type = 'button';
  button.value = text;
  button.style.cssText = 'height:34px;border-radius:10px;border:2px solid transparent;';
  button.onclick = onClick;
  transformButtons[key] = button;
  transformDialogEl.appendChild(button);
}
//Free move: an invisible layer over the video takes the mouse, dragging moves the picture, the wheel zooms
const panLayer = document.createElement('div');
panLayer.style.cssText = 'display:none;position:absolute;top:0px;left:0px;width:100%;height:100%;z-index:5;cursor:grab;';
videoContainerElement.appendChild(panLayer);
let panStart = null;
panLayer.addEventListener('mousedown', function(event) {panStart = {x: event.clientX - transformState.x, y: event.clientY - transformState.y}; panLayer.style.cursor = 'grabbing'; event.preventDefault();});
document.addEventListener('mousemove', function(event)
{
  if (!panStart) {return;}
  transformState.x = event.clientX - panStart.x;
  transformState.y = event.clientY - panStart.y;
  applyVideoTransform();
});
document.addEventListener('mouseup', function() {panStart = null; panLayer.style.cursor = 'grab';});
panLayer.addEventListener('wheel', function(event) {event.preventDefault(); zoomVideo(event.deltaY < 0 ? 1.1 : 1 / 1.1);}, {passive: false});
function zoomVideo(factor)
{
  transformState.zoom = Math.min(8, Math.max(0.2, transformState.zoom * factor));
  applyVideoTransform();
}
let moveMode = false;
function setMoveMode(on)
{
  moveMode = on;
  panLayer.style.display = on ? 'block' : 'none';
  transformButtons.move.style.border = on ? '2px solid var(--sliderColorFull)' : '2px solid transparent';
  transformButtons.move.style.color = on ? 'var(--sliderColorFull)' : '';
}
createTransformButton('in', '+', function() {zoomVideo(1.1);});
createTransformButton('out', '−', function() {zoomVideo(1 / 1.1);});
createTransformButton('rotate', 'Rotate', function() {transformState.rot = (transformState.rot + 90) % 360; applyVideoTransform();});
createTransformButton('move', 'Free move', function() {setMoveMode(!moveMode);});
createTransformButton('reset', 'Reset', function() {transformState.x = 0; transformState.y = 0; transformState.zoom = 1; transformState.rot = 0; applyVideoTransform();});
createTransformButton('save', 'Save', function()
{
  settings.videoTransform = {x: transformState.x, y: transformState.y, zoom: transformState.zoom, rot: transformState.rot};
  saveSettings();
  showToast('Video position saved');
});
createTransformButton('close', 'Close', function() {transformDialog.hide();});
document.body.appendChild(transformDialogEl);
const transformDialog = {
  show: function()
  {
    if (videoContainerElement.style.display !== 'block') {customAlert('Open a video first'); return;}
    transformDialogEl.style.display = 'flex';
    applyVideoTransform();
  },
  hide: function() {transformDialogEl.style.display = 'none'; setMoveMode(false);}
};
applyVideoTransform();
