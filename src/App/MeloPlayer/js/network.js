//Use network: load a stream (rtsp://, http(s) stream) or an .m3u / .m3u8 list from an address.
//HLS (.m3u8) is played by hls.js. rtsp (and rtmp/udp/rtp) is converted live to HLS by ffmpeg, then played by hls.js too.
let restreamServer = null;
let restreamCommand = null;
let restreamFolder = null;
let hlsInstance = null;
function getHlsLibrary()
{
  if (window.Hls) {return window.Hls;}
  try {const library = require(nodePath.join(appFolder, 'js', 'hls.min.js')); return library.default || library;} //Script tag exported it as a node module instead of a global
  catch (error) {console.log("hls.js not loaded: " + error.message); return null;}
}
//In NW.js' mixed context URL.createObjectURL can refuse a MediaSource (hls.js needs it). A Node-less frame has the plain browser one
let domUrlHelper = null;
function ensureMediaSourceUrl()
{
  if (domUrlHelper) {return;}
  const original = URL.createObjectURL;
  try {original.call(URL, new MediaSource()); domUrlHelper = original; return;} catch (error) {}
  try
  {
    const frame = document.createElement('iframe');
    frame.setAttribute('nwdisable', '');
    frame.style.cssText = 'display:none;';
    frame.src = 'about:blank';
    document.body.appendChild(frame);
    const plainUrl = frame.contentWindow.URL;
    domUrlHelper = function(object) {return plainUrl.createObjectURL(object);};
    URL.createObjectURL = function(object) {try {return original.call(URL, object);} catch (error) {return domUrlHelper(object);}};
  }
  catch (error) {console.log("Could not prepare MediaSource: " + error.message);}
}
function stopHls()
{
  if (!hlsInstance) {return false;}
  const hls = hlsInstance;
  hlsInstance = null;
  try {hls.stopLoad();} catch (error) {}
  try {hls.detachMedia();} catch (error) {}
  try {hls.destroy();} catch (error) {}
  return true;
}
//Everything a stream was doing is stopped and the video decoder is released (before another track loads)
function releaseStream()
{
  const hadHls = stopHls();
  stopRestream();
  if (hadHls || /^blob:/i.test(audioVideoElement.currentSrc || ''))
  {
    try {audioVideoElement.pause(); audioVideoElement.removeAttribute('src'); audioVideoElement.srcObject = null; audioVideoElement.load();} catch (error) {}
  }
}
function stopRestream()
{
  stopHls();
  if (restreamCommand) {try {restreamCommand.kill('SIGKILL');} catch (error) {} restreamCommand = null;}
  if (restreamServer) {try {restreamServer.close();} catch (error) {} restreamServer = null;}
  if (restreamFolder) {const folder = restreamFolder; restreamFolder = null; setTimeout(function() {try {fs.rmSync(folder, {recursive: true, force: true});} catch (error) {}}, 500);}
}
//Play an HLS address on the video element with hls.js
function playHls(address)
{
  stopHls();
  const Hls = getHlsLibrary();
  if (Hls && Hls.isSupported())
  {
    ensureMediaSourceUrl();
    //Streams are played, not stored: nothing behind the picture is kept unless Settings > Player says so (a worker that can't start falls back to the main thread by itself)
    const back = Math.max(0, Number(settings.streamBackBuffer) || 0);
    const ahead = Math.max(5, Number(settings.streamBuffer) || 15);
    const hls = new Hls({enableWorker: true, lowLatencyMode: false, liveSyncDurationCount: 3, backBufferLength: back, liveBackBufferLength: back,
      maxBufferLength: ahead, maxMaxBufferLength: ahead * 2, maxBufferSize: 40 * 1000 * 1000, capLevelToPlayerSize: true, progressive: false});
    hlsInstance = hls;
    hls.on(Hls.Events.MANIFEST_PARSED, function() {audioVideoElement.play().catch(function() {});});
    hls.on(Hls.Events.ERROR, function(event, data)
    {
      console.log("hls.js: " + data.type + " / " + data.details);
      if (!data.fatal || hlsInstance !== hls) {return;}
      if (networkAttemptActive) {audioVideoElement.dispatchEvent(new Event('streamfailed')); return;}
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {hls.recoverMediaError();}
      else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {setTimeout(function() {if (hlsInstance === hls) {hls.startLoad();}}, 2000);}
      else {customAlert('Stream error: ' + data.details);}
    });
    hls.loadSource(address);
    hls.attachMedia(audioVideoElement);
  }
  else if (audioVideoElement.canPlayType('application/vnd.apple.mpegurl'))
  {
    audioVideoElement.src = address;
    audioVideoElement.load();
    audioVideoElement.play().catch(function() {});
  }
  else {customAlert('This player can not play HLS streams here');}
}
//Address the video element/hls.js can use for a track. rtsp: ffmpeg writes HLS into a temp folder that a local server (127.0.0.1) hands out
function getPlayableSource(track)
{
  if (!track.stream) {return Promise.resolve(track.path);}
  return new Promise(function(resolve, reject)
  {
    stopRestream();
    const folder = fs.mkdtempSync(nodePath.join(require('os').tmpdir(), 'melo-hls-'));
    restreamFolder = folder;
    const types = {'.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t'};
    const server = require('http').createServer(function(request, response)
    {
      const name = nodePath.basename(decodeURIComponent(request.url.split('?')[0]));
      const file = nodePath.join(folder, name);
      fs.readFile(file, function(error, data)
      {
        if (error) {response.writeHead(404, {'Access-Control-Allow-Origin': '*'}); response.end(); return;}
        response.writeHead(200, {'Content-Type': types[nodePath.extname(name)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*'});
        response.end(data);
      });
    });
    server.on('error', reject);
    const isRtsp = /^rtsp/i.test(track.path);
    const command = ffmpeg(track.path)
    .inputOptions(isRtsp ? ['-rtsp_transport', 'tcp', '-fflags', 'nobuffer'] : [])
    .outputOptions(['-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-pix_fmt', 'yuv420p', '-g', '30', '-sc_threshold', '0', '-c:a', 'aac',
      '-f', 'hls', '-hls_time', '1', '-hls_list_size', '6', '-hls_flags', 'delete_segments+independent_segments', '-hls_segment_filename', nodePath.join(folder, 'seg%d.ts')])
    .output(nodePath.join(folder, 'index.m3u8'))
    .on('error', function(error) {if (restreamCommand === command) {console.log("Stream: " + error.message); reject(error);}});
    restreamCommand = command;
    command.run();
    server.listen(0, '127.0.0.1', function()
    {
      restreamServer = server;
      const address = 'http://127.0.0.1:' + server.address().port + '/index.m3u8';
      let waited = 0;
      const wait = setInterval(function()
      {
        waited += 250;
        if (restreamServer !== server) {clearInterval(wait); return;}
        let ready = false;
        try {ready = fs.readFileSync(nodePath.join(folder, 'index.m3u8'), 'utf8').includes('.ts');} catch (error) {}
        if (ready) {clearInterval(wait); resolve(address);}
        else if (waited > 30000) {clearInterval(wait); reject(new Error('No picture from the stream after 30 seconds'));}
      }, 250);
    });
  });
}

//Loading box with Cancel, shown while a network address is read and started
let networkAttemptActive = false;
let networkCancelled = false;
const networkBusyBox = document.createElement('div');
networkBusyBox.className = 'inputDialog';
networkBusyBox.style.cssText = 'z-index:1003;position-area:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);margin:0px;height:auto;width:auto;max-width:calc(100vw - 20px);padding:14px 20px;flex-direction:column;align-items:center;';
const networkBusyText = document.createElement('label');
networkBusyText.style.cssText = 'padding-bottom:8px;max-width:300px;overflow-wrap:anywhere;text-align:center;';
const networkBusyCancel = document.createElement('input');
networkBusyCancel.type = 'button';
networkBusyCancel.value = 'Cancel';
networkBusyCancel.style.cssText = 'height:34px;border-radius:10px;';
networkBusyCancel.onclick = function() {networkCancelled = true; audioVideoElement.dispatchEvent(new Event('streamcancel')); stopRestream(); setNetworkBusy(null);};
networkBusyBox.appendChild(networkBusyText);
networkBusyBox.appendChild(networkBusyCancel);
document.body.appendChild(networkBusyBox);
function setNetworkBusy(text)
{
  networkBusyBox.style.display = text ? 'flex' : 'none';
  if (text) {networkBusyText.textContent = text;}
}
//Resolves 'ok' when the picture plays, 'fail' on an error or timeout, 'cancel' when cancelled
function waitForNetworkPlayback(timeoutMs)
{
  return new Promise(function(resolve)
  {
    const finish = function(result)
    {
      clearTimeout(timer);
      ['playing', 'error', 'streamfailed', 'streamcancel'].forEach(function(name) {audioVideoElement.removeEventListener(name, handlers[name]);});
      resolve(result);
    };
    const handlers = {playing: function() {finish('ok');}, error: function() {finish('fail');}, streamfailed: function() {finish('fail');}, streamcancel: function() {finish('cancel');}};
    const timer = setTimeout(function() {finish('fail');}, timeoutMs);
    Object.keys(handlers).forEach(function(name) {audioVideoElement.addEventListener(name, handlers[name]);});
  });
}

//Add one address to the playlist. Returns the index of the new track
function addNetworkTrack(address, name, listedType, quiet)
{
  const clean = address.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  const extension = dot >= 0 ? clean.substring(dot).toLowerCase() : '';
  let type = 'video';
  let stream = false; //rtsp and similar go through ffmpeg (stream), .m3u8 is played by hls.js (hls), the rest plays directly
  if (fileTypes.Audio.includes(extension)) {type = 'audio';}
  if (/^rtsp|^rtmp|^udp|^rtp/i.test(address)) {stream = true;}
  const hls = (extension === '.m3u8');
  const track = {name: name || (clean.split('/').pop() || address), artist: '', image: 'set/default.jpg', path: address, duration: '', type: listedType || type, stream: stream, hls: hls};
  track_list.push(track);
  if (!quiet) {addPlaylistRows(track, track_list.length - 1);}
  return track_list.length - 1;
}
//Read the entries of an .m3u text
function parseM3u(text, baseAddress)
{
  const entries = [];
  let title = '';
  text.replace(/\r\n?/g, '\n').split('\n').forEach(function(line)
  {
    line = line.trim();
    if (!line) {return;}
    if (line.startsWith('#EXTINF')) {title = line.substring(line.indexOf(',') + 1).trim(); return;}
    if (line.startsWith('#')) {return;}
    let address = line;
    try {address = baseAddress ? new URL(line, baseAddress).toString() : line;} catch (error) {}
    entries.push({address: address, name: title});
    title = '';
  });
  return entries;
}
//Text of an http(s) address. The browser XHR first (Node's fetch gives "fetch failed" in NW.js), then node's own http client
function fetchText(address)
{
  return new Promise(function(resolve, reject)
  {
    const viaNode = function(url, redirects)
    {
      try
      {
        const client = require(/^https:/i.test(url) ? 'https' : 'http');
        const request = client.get(url, {headers: {'User-Agent': 'Mozilla/5.0'}, rejectUnauthorized: false, timeout: 15000}, function(response)
        {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && redirects < 5)
          {
            response.resume();
            return viaNode(new URL(response.headers.location, url).toString(), redirects + 1);
          }
          if (response.statusCode !== 200) {response.resume(); return reject(new Error('Server answered ' + response.statusCode));}
          let data = '';
          response.setEncoding('utf8');
          response.on('data', function(chunk) {data += chunk;});
          response.on('end', function() {resolve(data);});
        });
        request.on('timeout', function() {request.destroy(new Error('Timeout'));});
        request.on('error', function(error) {reject(new Error(error.message));});
      }
      catch (error) {reject(error);}
    };
    try
    {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', address);
      xhr.timeout = 15000;
      xhr.onload = function() {if (xhr.status >= 200 && xhr.status < 300) {resolve(xhr.responseText);} else {viaNode(address, 0);}};
      xhr.onerror = xhr.ontimeout = function() {viaNode(address, 0);};
      xhr.send();
    }
    catch (error) {viaNode(address, 0);}
  });
}
async function loadNetworkUrl(address)
{
  address = address.trim();
  if (!address) {return;}
  networkCancelled = false;
  networkAttemptActive = true;
  setNetworkBusy('Loading...');
  try
  {
    const firstNew = track_list.length;
    const clean = address.split('?')[0].toLowerCase();
    const isPlaylistAddress = !/^(rtsp|rtmp|udp|rtp):/i.test(address) && (clean.endsWith('.m3u') || clean.endsWith('.m3u8'));
    const isLocalFile = !/^[a-z][a-z0-9+.-]*:\/\//i.test(address);
    if (isPlaylistAddress)
    {
      let text = null;
      if (isLocalFile) {text = fs.readFileSync(address, 'utf8');}
      else
      {
        try {text = await fetchText(address);}
        catch (error)
        {
          console.log("Could not read the list: " + error.message);
          if (!clean.endsWith('.m3u8')) {throw error;} //An .m3u8 that can't be read here is still tried as a stream by hls.js
        }
      }
      if (text === null) {addNetworkTrack(address, address.split('/').pop().split('?')[0], 'video', true);}
      else
      if (text.includes('#EXT-X-TARGETDURATION') || text.includes('#EXT-X-STREAM-INF'))
      {
        addNetworkTrack(address, address.split('/').pop().split('?')[0], 'video', true); //One HLS stream, not a list
      }
      else
      {
        const entries = parseM3u(text, isLocalFile ? null : address);
        if (entries.length === 0) {throw new Error('No entries found in the list');}
        entries.forEach(function(entry) {addNetworkTrack(entry.address, entry.name, null, true);});
      }
    }
    else {addNetworkTrack(address, '', null, true);}
    if (networkCancelled) {track_list.length = firstNew; networkAttemptActive = false; return;}
    //All new entries go into the lists at once
    clearList();
    populateVideo();
    populateMusic();
    //Play the first entry that works. An entry that does not start within 20 seconds is skipped, the next one is tried
    let index = firstNew;
    let tries = 0;
    while (index < track_list.length && tries < 10 && !networkCancelled)
    {
      track_index = index;
      if (track_list[index].type.includes('audio')) {openMusic();} else {openVideo();}
      setNetworkBusy('Loading ' + track_list[index].name + '...');
      const started = waitForNetworkPlayback(20000);
      loadTrack(index);
      playTrack();
      applySelectionHighlightPlaylist(true);
      const result = await started;
      if (result === 'ok') {setNetworkBusy(null); networkAttemptActive = false; return;}
      if (result === 'cancel') {break;}
      stopRestream();
      tries++;
      index++;
      if (index < track_list.length && tries < 10) {showToast('Could not play it, trying the next one');}
    }
    setNetworkBusy(null);
    if (!networkCancelled)
    {
      audioVideoElement.pause();
      customAlert('Could not play ' + (tries > 1 ? 'any of the first ' + tries + ' entries' : '"' + track_list[firstNew].name + '"') + '. Check the address and your connection.');
    }
  }
  catch (error)
  {
    setNetworkBusy(null);
    console.log("Network load failed: " + error.message);
    customAlert('Could not load: ' + error.message);
  }
  networkAttemptActive = false;
}
//Window with the address box
const networkContainer = document.createElement('div');
networkContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
const networkTitle = document.createElement('label');
networkTitle.innerText = 'Use network:';
networkTitle.style.paddingBottom = '6px';
networkContainer.appendChild(networkTitle);
const networkInput = document.createElement('input');
networkInput.type = 'text';
networkInput.placeholder = 'rtsp://..., http://... or a .m3u list';
networkInput.style.cssText = 'width:380px;height:30px;margin-bottom:6px;user-select:text;';
networkInput.onkeydown = function(event) {event.stopPropagation(); if (event.code === 'Enter') {networkLoadButton.click();}}; //Keys typed here must not control the player
networkContainer.appendChild(networkInput);
const networkHint = document.createElement('div');
networkHint.style.cssText = 'width:380px;text-align:center;opacity:0.7;font-size:12px;';
networkHint.textContent = 'Camera or stream address, or a playlist (.m3u / .m3u8) to load all of its entries';
networkContainer.appendChild(networkHint);
const networkLoadButton = document.createElement('input');
networkLoadButton.type = 'button';
networkLoadButton.value = 'Load';
networkLoadButton.style.cssText = 'height:40px;border-radius:10px;';
networkLoadButton.onclick = function() {const address = networkInput.value; networkMenu.hide(); loadNetworkUrl(address);};
const networkMenu = new SelectActionMenu("networkMenuID", [], () => {}, "Use network:", "Select", false, networkContainer);
networkMenu.dialog.style.height = 'auto';
networkMenu.dialog.style.width = '440px';
networkMenu.dialog.style.paddingBottom = '10px';
networkMenu.onShow = function() {setTimeout(function() {networkInput.focus();}, 50);};
const networkButtonRow = networkMenu.dialog.lastChild;
networkButtonRow.insertBefore(networkLoadButton, networkButtonRow.firstChild);
