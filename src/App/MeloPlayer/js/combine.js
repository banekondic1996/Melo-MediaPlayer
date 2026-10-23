//Combine videos: drop videos into the window (or add them with the buttons), drag them or use the arrows to set the order,
//optionally mute the sound, then they are joined into one mp4 with ffmpeg (same ffmpeg as Convert, progress bar and Kill button work too).
let combineItems = [];
let combineDragIndex = null;
const combineContainer = document.createElement('div');
combineContainer.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
const combineTitle = document.createElement('label');
combineTitle.innerText = 'Combine videos:';
combineTitle.style.paddingBottom = '6px';
combineContainer.appendChild(combineTitle);
//Drop area with the list
const combineList = document.createElement('div');
combineList.style.cssText = 'width:400px;min-height:120px;max-height:240px;overflow-y:auto;border:1px dashed #80808099;border-radius:10px;padding:4px;box-sizing:border-box;';
combineContainer.appendChild(combineList);
function createCombineButton(text, onClick, small)
{
  const button = document.createElement('input');
  button.type = 'button';
  button.value = text;
  button.style.cssText = small ? 'height:26px;width:28px;border-radius:8px;margin:2px;padding:0px;' : 'height:34px;border-radius:10px;';
  button.onclick = onClick;
  return button;
}
function moveCombineItem(from, to)
{
  if (to < 0 || to >= combineItems.length || from === to) {return;}
  const item = combineItems.splice(from, 1)[0];
  combineItems.splice(to, 0, item);
  renderCombineList();
}
function renderCombineList()
{
  combineList.innerHTML = '';
  if (combineItems.length === 0)
  {
    const hint = document.createElement('div');
    hint.textContent = 'Drop videos here';
    hint.style.cssText = 'text-align:center;opacity:0.6;padding-top:44px;';
    combineList.appendChild(hint);
    return;
  }
  combineItems.forEach(function(item, index)
  {
    const row = document.createElement('div');
    row.draggable = true;
    row.style.cssText = '-webkit-user-drag:element;display:flex;align-items:center;justify-content:space-between;padding:2px 4px;border-radius:8px;cursor:grab;';
    row.onmouseenter = function() {row.style.background = 'var(--selected)';};
    row.onmouseleave = function() {row.style.background = '';};
    const label = document.createElement('div');
    label.textContent = (index + 1) + '. ' + item.name;
    label.title = item.path;
    label.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    row.appendChild(label);
    row.appendChild(createCombineButton('▲', function() {moveCombineItem(index, index - 1);}, true));
    row.appendChild(createCombineButton('▼', function() {moveCombineItem(index, index + 1);}, true));
    row.appendChild(createCombineButton('✕', function() {combineItems.splice(index, 1); renderCombineList();}, true));
    //Reorder by dragging rows
    row.ondragstart = function(event) {combineDragIndex = index; event.dataTransfer.setData('text/plain', 'melo-row'); event.dataTransfer.effectAllowed = 'move';};
    row.ondragend = function() {combineDragIndex = null;};
    row.ondragover = function(event) {if (combineDragIndex !== null) {event.preventDefault(); event.stopPropagation();}};
    row.ondrop = function(event)
    {
      if (combineDragIndex === null) {return;}
      event.preventDefault();
      event.stopPropagation();
      const from = combineDragIndex;
      combineDragIndex = null;
      moveCombineItem(from, index);
    };
    combineList.appendChild(row);
  });
}
//Add files (only videos, same file path for the same file only once)
function addCombineFiles(paths)
{
  paths.forEach(function(filePath)
  {
    const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    if (!fileTypes.Video.includes(extension)) {console.log('Combine: not a video: ' + filePath); return;}
    combineItems.push({path: filePath, name: pathArgSpliter(filePath).pop()});
  });
  renderCombineList();
}
//Dropping files on the window. The events are stopped here, so the main player doesn't add them to its playlist
['dragenter', 'dragover'].forEach(function(name)
{
  combineContainer.addEventListener(name, function(event) {event.preventDefault(); event.stopPropagation();});
});
combineContainer.addEventListener('drop', function(event)
{
  event.preventDefault();
  event.stopPropagation();
  if (combineDragIndex !== null) {return;}
  const paths = [];
  for (let i = 0; i < event.dataTransfer.files.length; i++) {if (event.dataTransfer.files[i].path) {paths.push(event.dataTransfer.files[i].path);}}
  addCombineFiles(paths);
});
//Buttons: add files, add the playing video
const combineFileInput = document.createElement('input');
combineFileInput.type = 'file';
combineFileInput.multiple = true;
combineFileInput.accept = 'video/*';
combineFileInput.style.display = 'none';
combineFileInput.onchange = function()
{
  const paths = [];
  for (let i = 0; i < combineFileInput.files.length; i++) {paths.push(combineFileInput.files[i].path);}
  combineFileInput.value = '';
  addCombineFiles(paths);
};
const combineAddRow = document.createElement('div');
combineAddRow.appendChild(createCombineButton('Add files', function() {openFileDialog(combineFileInput);}, false));
combineAddRow.appendChild(createCombineButton('Add current video', function()
{
  const track = track_list[track_index];
  if (track && track.type && track.type.includes('video')) {addCombineFiles([track.path.replace(/^file:\/\//, '')]);}
  else {customAlert('No video is playing');}
}, false));
combineContainer.appendChild(combineAddRow);
const combineMuteCheckbox = document.createElement('input');
combineMuteCheckbox.type = 'checkbox';
combineContainer.appendChild(createSubtitleRow('Mute sound', combineMuteCheckbox));
combineContainer.appendChild(combineFileInput);

//ffmpeg: info about one video
function probeCombineFile(filePath)
{
  return new Promise(function(resolve, reject)
  {
    ffmpeg.ffprobe(filePath, function(error, data)
    {
      if (error || !data) {reject(error || new Error('ffprobe failed')); return;}
      const video = data.streams.find(function(stream) {return stream.codec_type === 'video';});
      const audio = data.streams.find(function(stream) {return stream.codec_type === 'audio';});
      resolve({duration: parseFloat(data.format.duration) || 0, width: video ? video.width : 0, height: video ? video.height : 0, hasAudio: !!audio});
    });
  });
}
//"00:01:05.12" to seconds
function combineTimemarkSeconds(text)
{
  const parts = String(text).split(':').map(parseFloat);
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0;
}
async function runCombine()
{
  if (combineItems.length < 2) {customAlert('Add at least 2 videos'); return;}
  if (ffmpegOn) {customAlert('Another conversion is running'); return;}
  try
  {
    const infos = [];
    for (const item of combineItems) {infos.push(await probeCombineFile(item.path));}
    const mute = combineMuteCheckbox.checked;
    //Size of the first video (even numbers), others are scaled to fit with black bars
    const first = infos.find(function(info) {return info.width > 0;});
    if (!first) {throw new Error('No video stream found');}
    const width = first.width - (first.width % 2);
    const height = first.height - (first.height % 2);
    const filters = [];
    let concatInputs = '';
    infos.forEach(function(info, index)
    {
      filters.push('[' + index + ':v]scale=' + width + ':' + height + ':force_original_aspect_ratio=decrease,pad=' + width + ':' + height + ':(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v' + index + ']');
      concatInputs += '[v' + index + ']';
      if (!mute)
      {
        //A video without sound gets silence of the same length, so the sound stays in sync
        if (info.hasAudio) {filters.push('[' + index + ':a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a' + index + ']');}
        else {filters.push('aevalsrc=0|0:d=' + info.duration + ':s=44100[a' + index + ']');}
        concatInputs += '[a' + index + ']';
      }
    });
    filters.push(concatInputs + 'concat=n=' + infos.length + ':v=1:a=' + (mute ? 0 : 1) + (mute ? '[v]' : '[v][a]'));
    const total = infos.reduce(function(sum, info) {return sum + info.duration;}, 0);
    const firstPath = combineItems[0].path;
    const outputFile = firstPath.substring(0, firstPath.lastIndexOf('.')) + '_combined' + Math.floor(Math.random() * 999) + '.mp4';
    const progressBar = document.getElementById('conversion');
    const job = ffmpeg();
    combineItems.forEach(function(item) {job.input(item.path);});
    job.complexFilter(filters.join(';'))
    .outputOptions(mute ? ['-map', '[v]', '-an', '-movflags', '+faststart'] : ['-map', '[v]', '-map', '[a]', '-movflags', '+faststart'])
    .format('mp4')
    .output(outputFile)
    .on('progress', function(progress)
    {
      progressBar.style.display = 'block';
      progressBar.value = Math.min(100, combineTimemarkSeconds(progress.timemark) * 100 / (total || 1));
    })
    .on('end', function()
    {
      ffmpegOn = false;
      progressBar.style.display = 'none';
      customAlert('Combined video saved: ' + pathArgSpliter(outputFile).pop());
    })
    .on('error', function(error)
    {
      ffmpegOn = false;
      progressBar.style.display = 'none';
      console.error(error);
      if (ffmpegOn === false) {customAlert('Combining failed: ' + (error.message || error).toString().split('\n')[0]);}
    });
    window.command = job; //Kill button in the trim bar uses these
    fileInProcess = outputFile;
    ffmpegOn = true;
    customAlert('Combining started, progress is shown at the bottom left');
    job.run();
  }
  catch (error)
  {
    console.error(error);
    customAlert('Could not combine: ' + error.message);
  }
}
const combineMenu = new SelectActionMenu("combineMenuID", [], () => {}, "Combine videos:", "Select", false, combineContainer);
combineMenu.dialog.style.height = 'auto';
combineMenu.dialog.style.width = '460px';
combineMenu.dialog.style.paddingBottom = '10px';
const combineButtonRow = combineMenu.dialog.lastChild;
combineButtonRow.insertBefore(createCombineButton('Combine', runCombine, false), combineButtonRow.firstChild);
combineButtonRow.firstChild.style.height = '40px';
renderCombineList();
