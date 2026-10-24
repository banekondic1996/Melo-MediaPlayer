//Cast: shows the playing video on another display. The picture goes to a second full screen window on the chosen display, kept in sync with the player
//(sound stays on this player). "Cast device" uses Chrome's Remote Playback API (Chromecast etc.) when this NW.js build has it.
let castWindow = null;
let castVideo = null;
let castStreamTrack = null;
const castContainer = document.createElement('div');
castContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
const castTitle = document.createElement('label');
castTitle.innerText = 'Cast video:';
castTitle.style.paddingBottom = '6px';
castContainer.appendChild(castTitle);
const castDisplaySelect = document.createElement('select');
castDisplaySelect.style.width = '200px';
castContainer.appendChild(createSubtitleRow('Display', castDisplaySelect));
const castStatus = document.createElement('div');
castStatus.style.cssText = 'width:380px;text-align:center;opacity:0.7;padding:4px 0px;';
castContainer.appendChild(castStatus);

//Is this player window on the given display?
function isCurrentDisplay(screen)
{
  try
  {
    const centerX = win.x + win.width / 2;
    const centerY = win.y + win.height / 2;
    const b = screen.bounds;
    return centerX >= b.x && centerX < b.x + b.width && centerY >= b.y && centerY < b.y + b.height;
  }
  catch (error) {return false;}
}
//Displays connected to this computer
function fillCastDisplays()
{
  castDisplaySelect.innerHTML = '';
  let screens = [];
  try {nw.Screen.Init(); screens = nw.Screen.screens || [];} catch (error) {console.log("Could not list displays: " + error.message);}
  screens.forEach(function(screen, index)
  {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = 'Display ' + (index + 1) + ' (' + screen.bounds.width + 'x' + screen.bounds.height + ')' + (screen.isBuiltIn ? ' - built in' : '') + (isCurrentDisplay(screen) ? ' - this player (opens a movable window)' : '');
    castDisplaySelect.appendChild(option);
  });
  if (screens.length > 1) {castDisplaySelect.value = String(screens.length - 1);} //Usually the external one is last
  return screens;
}
function updateCastStatus() {castStatus.textContent = castWindow ? (castMode === "canvas" ? "Casting visuals" : "Casting") : "Not casting";}

//Keep the cast window in step with the player (source, position, play/pause, speed)
function syncCast()
{
  if (!castVideo) {return;}
  try
  {
    //hls.js streams play from a MediaSource (a blob address that only works in this window), so they are cast as a live picture of the player's video
    const current = track_list[track_index];
    if (current && (current.hls || current.stream))
    {
      if (castStreamTrack !== current || !castVideo.srcObject)
      {
        castStreamTrack = current;
        castVideo.removeAttribute('src');
        castVideo.srcObject = audioVideoElement.captureStream ? audioVideoElement.captureStream() : null;
      }
      if (castVideo.srcObject && castVideo.paused) {castVideo.play().catch(function() {});}
      return;
    }
    if (castVideo.srcObject) {castVideo.srcObject = null; castStreamTrack = null;}
    const source = audioVideoElement.currentSrc || audioVideoElement.src;
    if (source && castVideo.src !== source) {castVideo.src = source; castVideo.currentTime = audioVideoElement.currentTime;}
    castVideo.playbackRate = audioVideoElement.playbackRate;
    if (Math.abs(castVideo.currentTime - audioVideoElement.currentTime) > 0.4) {castVideo.currentTime = audioVideoElement.currentTime;}
    if (audioVideoElement.paused) {if (!castVideo.paused) {castVideo.pause();}}
    else if (castVideo.paused) {castVideo.play().catch(function() {});}
  }
  catch (error) {console.log("Cast sync: " + error.message);}
}
const castEvents = ['play', 'pause', 'seeked', 'ratechange', 'loadstart', 'timeupdate'];
function stopCast()
{
  castEvents.forEach(function(name) {audioVideoElement.removeEventListener(name, syncCast);});
  const windowToClose = castWindow;
  castWindow = null;
  castVideo = null;
  if (windowToClose) {try {windowToClose.close(true);} catch (error) {}}
  updateCastStatus();
}
//What is cast: the video, or the visualizer picture (canvas)
let castMode = 'video';
function castVideoMenu() {castMode = 'video'; castMenu.show();}
function castVisualsMenu() {castMode = 'canvas'; castMenu.show();}
function startCast()
{
  const screens = fillCastDisplays();
  const screen = screens[parseInt(castDisplaySelect.value, 10)];
  if (!screen) {customAlert('No display found'); return;}
  if (castWindow) {stopCast();}

  const bounds = screen.bounds;

  // cast.html is next to index.html
  const castUrl = new URL('cast.html', location.href).href;

  // Always open a frameless window, then make it fullscreen.
  const windowOptions = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    focus: true
  };

  const mode = castMode;
  nw.Window.open(castUrl, windowOptions, function(newWindow)
  {
    castWindow = newWindow;

    newWindow.on('loaded', function()
    {
      castVideo = newWindow.window.document.getElementById('castVideo');

      // Position the window on the selected display.
      try {newWindow.moveTo(bounds.x, bounds.y);} catch (error) {}
      try {newWindow.enterFullscreen();} catch (error) {}

      if (mode === 'canvas')
      {
        //Visualizer: the canvas picture is streamed to the cast window
        try {castVideo.srcObject = canvas.captureStream(30); castVideo.play().catch(function() {});}
        catch (error) {customAlert('Could not cast the visuals: ' + error.message);}
        castVideo = null; //No video sync needed
      }
      else
      {
        // Keep playback synchronized with the main player.
        castEvents.forEach(function(name)
        {
          audioVideoElement.addEventListener(name, syncCast);
        });
        syncCast();
      }
      updateCastStatus();
    });

    newWindow.on('closed', function()
    {
      if (castWindow === newWindow) {stopCast();}
    });
  });
}
const castButtons = document.createElement('div');
const castStartButton = document.createElement('input');
castStartButton.type = 'button';
castStartButton.value = 'Cast';
castStartButton.style.cssText = 'height:40px;border-radius:10px;';
castStartButton.onclick = startCast;
const castStopButton = document.createElement('input');
castStopButton.type = 'button';
castStopButton.value = 'Stop';
castStopButton.style.cssText = 'height:40px;border-radius:10px;';
castStopButton.onclick = stopCast;
castButtons.appendChild(castStartButton);
castButtons.appendChild(castStopButton);
//Chromecast and similar (only if this build has the Remote Playback API with a device picker)
if (audioVideoElement.remote && audioVideoElement.remote.prompt)
{
  const castDeviceButton = document.createElement('input');
  castDeviceButton.type = 'button';
  castDeviceButton.value = 'Cast device...';
  castDeviceButton.style.cssText = 'height:40px;border-radius:10px;';
  castDeviceButton.onclick = function()
  {
    audioVideoElement.remote.prompt().catch(function(error) {customAlert('No cast device: ' + error.message);});
  };
  castButtons.appendChild(castDeviceButton);
}
castContainer.appendChild(castButtons);

//The cast window must close together with the player (otherwise the app keeps running)
window.addEventListener('beforeunload', function() {if (castWindow) {try {castWindow.close(true);} catch (error) {}}});
try {nw.Window.get().on('closed', stopCast);} catch (error) {}
const castMenu = new SelectActionMenu("castMenuID", [], () => {}, "Cast video:", "Select", false, castContainer);
castMenu.dialog.style.height = 'auto';
castMenu.dialog.style.width = '460px';
castMenu.dialog.style.paddingBottom = '10px';
castMenu.onShow = function() {fillCastDisplays(); updateCastStatus();};
