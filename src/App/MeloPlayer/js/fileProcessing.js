//One place that makes the rows of a track in the playlists (music list, video list, video side list)
function escapeHtml(text) {return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function addPlaylistRows(track, index)
{
  const cells = '<td>' + escapeHtml(track.name) + '</td><td class="track-duration" style="align-self: center;">' + (track.duration || '') + '</td>';
  if (track.type && track.type.includes('audio'))
  {
    playlistMusic.insertAdjacentHTML('beforeend',
    '<tr trackIndex="' + index + '" onclick="loadTrack(\'' + index + '\');playTrack();resetSelectionHighlightPlaylist();this.classList.add(\'selected\')">' + cells + '</tr>');
  }
  else if (track.type && track.type.includes('video'))
  {
    const row = '<tr trackIndex="' + index + '" onclick="loadTrack(\'' + index + '\');playTrack();applySelectionHighlightPlaylist(true);">' + cells + '</tr>';
    playlistVideo.insertAdjacentHTML('beforeend', row); //No re-parsing of the whole list, so thousands of entries stay fast
    const sideBody = (tabelaVideoBarLista.tBodies && tabelaVideoBarLista.tBodies[0]) ? tabelaVideoBarLista.tBodies[0] : tabelaVideoBarLista;
    sideBody.insertAdjacentHTML('beforeend', row);
    updateSideSearch();
  }
}
//Search box at the bottom of the video side list, only when there are more than 10 videos
function updateSideSearch()
{
  const body = tabelaVideoBarLista.tBodies && tabelaVideoBarLista.tBodies[0];
  if (!body) {return;}
  videoPlaylistElement.classList.toggle('hasSearch', body.rows.length - 1 > 10);
}
function searchSideList(input)
{
  const filter = input.value.toUpperCase();
  const rows = tabelaVideoBarLista.tBodies[0].rows;
  for (let i = 0; i < rows.length; i++)
  {
    const cell = rows[i].getElementsByTagName('td')[0];
    if (cell) {rows[i].style.display = (cell.textContent.toUpperCase().indexOf(filter) > -1) ? '' : 'none';}
  }
}
//Context menu of playlist items (music list, video list and the video side list)
let contextItemIndex = -1;
function isNetworkPath(path) {return /^[a-z][a-z0-9+.-]*:\/\//i.test(path) && !/^file:\/\//i.test(path);}
document.addEventListener('contextmenu', function(event)
{
  const row = event.target.closest ? event.target.closest('tr[trackIndex]') : null;
  if (!row) {return;}
  const index = parseInt(row.getAttribute('trackIndex'), 10);
  if (isNaN(index) || !track_list[index]) {return;}
  event.preventDefault();
  contextItemIndex = index;
  keepListUntil = Date.now() + 1500;
  const menu = document.getElementById('contextMenuItemId');
  document.getElementById('itemOpenFolderRowID').style.display = isNetworkPath(track_list[index].path) ? 'none' : '';
  menu.style.display = 'block';
  const flipLeft = event.clientX + menu.offsetWidth > window.innerWidth ? event.clientX - menu.offsetWidth : event.clientX;
  const flipTop = event.clientY + menu.offsetHeight > window.innerHeight ? event.clientY - menu.offsetHeight : event.clientY;
  menu.style.left = Math.max(0, flipLeft) + 'px';
  menu.style.top = Math.max(0, flipTop) + 'px';
});
document.addEventListener('click', function() {keepListUntil = Date.now() + 1500; document.getElementById('contextMenuItemId').style.display = 'none';});
function removeTrackFromPlaylist(index)
{
  if (!track_list[index]) {return;}
  const wasCurrent = (index === track_index);
  const wasPlaying = !audioVideoElement.paused;
  track_list.splice(index, 1);
  if (index < track_index) {track_index--;}
  else if (wasCurrent) {track_index = Math.min(index, Math.max(track_list.length - 1, 0));}
  clearList();
  populateVideo();
  populateMusic();
  if (wasCurrent)
  {
    if (track_list.length > 0) {loadTrack(track_index); if (wasPlaying) {playTrack();}}
    else
    {
      audioVideoElement.pause();
      audioVideoElement.removeAttribute('src');
      audioVideoElement.load();
      track_name.textContent = '';
    }
  }
  if (track_list.length > 0) {applySelectionHighlightPlaylist(true);}
}
function openTrackFolder(index)
{
  const track = track_list[index];
  if (!track || isNetworkPath(track.path)) {return;}
  const filePath = track.path.replace(/^file:\/\//, '');
  try {nw.Shell.showItemInFolder(filePath);} catch (error) {customAlert('Could not open the folder: ' + error.message);}
}
//File path string splitter, depends on platform
function pathArgSpliter(filePath){
    if (processPlatform == "win32") {return filePath.split("\\");}
    else{return filePath.split("/");}
  }
  
  /* const { Worker } = require("worker_threads");
  const worker = new Worker("./metadataWorker.js");
  worker.on("message", (data) => 
  {
    if (data.success) 
      {
        console.log(`Metadata loaded:`, data.metadata);
        updateTrackMetadata(data.metadata); // ✅ Update UI
      } 
    else {console.error("Metadata error:", data.error);}  
  });
  worker.on("error", (err) => console.error("Worker Error:", err));
  worker.on("exit", (code) => { if (code !== 0) console.error(`Worker stopped with exit code ${code}`);}); */
   
  // Process file and push into list (Not used yet, cause it's slower)
  async function processFile(filePath, silent)
  {
    let found_file=0;
    track_list.forEach((element,index)=>{if (filePath==element.path || (processPlatform != "win32" && "file://"+filePath==element.path)) {found_file=1;track_index=index;return}});
    if (processPlatform != "win32") {filePath="file://"+filePath;} // If not on windows, adds needes string to file path
    /* if(processPlatform=='win32'){filePath.replace(/\\/g, '\\\\');} */
    let splitArg=pathArgSpliter(filePath); // Split given file path into strings
    let nameIndex=splitArg.length-1; // Index of file name in splited string array, last one is extension
    let nameArg=splitArg[nameIndex];  // The name of file including file extension
    let extArg=filePath.substring(filePath.lastIndexOf('.')).toLowerCase() // The file extension
    if(!fileTypes.Audio.includes(extArg) && !fileTypes.Video.includes(extArg)){console.log('Not a supported file: '+filePath);return;} // Unknown files in the list used to crash the player
    let fileType // The file type
    nameArg=nameArg.substring(0,nameArg.lastIndexOf('.')) // The name of the file, removes extension if left
    let duration; // The audio/video duration variable
    let folderPath = filePath.substring(0, filePath.length-nameArg.length); // Path of folder that contains the file
    let durationMinutes
    let durationSeconds
      track_list.forEach(function(element,index) { if (filePath==element.path){found_file=1;track_index=index;if(!silent){playTrack(track_index)}}} );
      if(found_file==0)
      { 
        track_index=track_list.length; // Not -1 cause file will be added and track_list length will increase by 1
        fileType = fileTypes.Audio.includes(extArg) ? 'audio' : 'video';
        let theFile={"name": nameArg, "artist": "","image":"set/default.jpg","path":filePath,"duration":"","type":fileType};
        console.log("Push non repeated file");
        track_list.push(theFile);
        addPlaylistRows(theFile, track_index);
       /*  worker.postMessage({trackIndex: Number(track_index),filePath: filePath }); */
        loadMetaData(track_index);
        console.log(theFile);
      }
  }
  /* function updateTrackMetadata(metadata) {
    let track = track_list[metadata.trackIndex];
    track.duration = metadata.duration;
    // Assuming there's a UI element for duration update
    let durationElement = document.querySelector(`tr[trackIndex='${metadata.trackIndex}'] .track-duration`);
    if (durationElement) {
      durationElement.textContent = metadata.duration;
    }
    console.log(`Updated track metadata:`, track);
  } */
  async function loadMetaData(trackIndex){
    let duration;
    let durationMinutes;
    let durationSeconds;
    ffmpeg.ffprobe(track_list[trackIndex].path,function(err, data) 
      {
        duration=data.format.duration;
        console.log(data.format.duration);
        durationMinutes = Math.floor(duration / 60);
        durationSeconds = Math.floor(duration - durationMinutes * 60);
        durationMinutes = padZero(parseInt(durationMinutes, 10));
        durationSeconds= padZero(parseInt(durationSeconds, 10));
        let el=document.body.querySelectorAll('tr[trackIndex="'+trackIndex+'"]');
        el.forEach((el)=>
          { 
            el.children[1].innerHTML=durationMinutes+":"+durationSeconds;
            track_list[trackIndex].duration=durationMinutes+":"+durationSeconds;
            console.log("duration metadata: "+duration);
          })
        }); 
    /* document.body.querySelector('tr[trackIndex]').forEach((el) => 
    {
      ffmpeg.ffprobe(track_list[el.attributes.trackindex.value].path,function(err, data) 
      {
        duration=data.format.duration;
        console.log(data.format.duration);
        durationMinutes = Math.floor(duration / 60);
        durationSeconds = Math.floor(duration - durationMinutes * 60);
        durationMinutes = padZero(parseInt(durationMinutes, 10));
        durationSeconds= padZero(parseInt(durationSeconds, 10));
        el.children[1].innerHTML=durationMinutes+":"+durationSeconds
        track_list[el.attributes.trackindex.value].duration=durationMinutes+":"+durationSeconds;
        console.log("duration metadata: "+duration);
  
        }); 
    }); */
  }  
//Save playlist START
function savePlaylist(path) {
    try {
          // Check if the playlist has valid data
          if (!Array.isArray(track_list) || track_list.length === 0) 
          {
              alert("Playlist is empty. Add tracks before saving.");
              return;
          }
          // Convert the playlist to JSON
          const playlistJson = JSON.stringify(track_list, null, 2);
          console.log("JSON Data:", playlistJson); // Debug log
          console.log("Savepath is: "+ path)
          //If path not given
          if (!path) {alert("Save operation canceled."); return;}
          // Write the JSON to the chosen file
          fs.writeFileSync(path, playlistJson, 'utf8');
          alert(`Playlist saved successfully to: ${path}`);
       } 
    catch (error) 
    {
        console.error("Error saving playlist:", error);
        alert("An error occurred while saving the playlist. Check the console for details.");
    }
}
//Save playlist END

//Load saved playlist via file START
function loadPlaylist(event) {
    const file = event.target.files[0];
    if (!file) {  alert("No file selected."); return;}
    const reader = new FileReader();
    reader.onload = function(e) 
    {
        try
        {
            // Parse the JSON file
            const loadedPlaylist = JSON.parse(e.target.result);
            // Validate the data format (check for required properties)
            if (Array.isArray(loadedPlaylist) && loadedPlaylist.every(track => track.name && track.path)) 
            {
                track_list = loadedPlaylist; // Update the track_list
                alert("Playlist loaded successfully!");
                // Refresh the displayed playlist
                clearList(); //Clear all playlist tables
                populateMusic(); //Populate music playlist table
                populateVideo(); //Populate video playlist table
            } else {alert("Invalid playlist format.");} 
        }
        catch (error) {alert("Error loading playlist: " + error.message);}
    };
    // Read the file as text
    reader.readAsText(file);
}
//Load playlist END
//Load media from current folder
function loadMediaFromCurrentFolder(){
  let useFolderInput=document.getElementById('useFolderID');
  let filePath=track_list[track_index].path; // Current track file path 
  let splitArg=pathArgSpliter(filePath); // Split file path into segments
  let nameLen=splitArg.length-1; // Name part index of string
  let nameArg=splitArg[nameLen]; // The name of file
  let index=0; // Starting trim index
  if (processPlatform != "win32") {index=7} // To trim "file://" from file path
  let folderPath = filePath.substring(index, filePath.length-nameArg.length); // Final folder path
  useFolderInput.nwworkingdir=folderPath; // Add default start directory to open folder dilog
  openFileDialog(useFolderInput); // Simulate click to start open folder dilog (leaves fullscreen first)
}
//Use folder function START
function useFolder(files){
  const playingIndex = track_list.length>0 ? track_index : null; // Adding files must not change which track is the current one
  const sortedFiles = Array.from(files).sort(function(a,b){return a.name.localeCompare(b.name, undefined, {numeric:true});});
  for (let i=0;i<sortedFiles.length;i++)
  {
    if(sortedFiles[i].type.includes("audio") || sortedFiles[i].type.includes("video") && !sortedFiles[i].type.includes("tts") )
    {
      console.log(sortedFiles[i])
      processFile(sortedFiles[i].path, true); // silent: doesn't restart playback
    }
  }
  if (playingIndex !== null) {track_index = playingIndex;}
  clearList();
  populateVideo(); //Populate video playlist table
  populateMusic(); //Populate video playlist table
  if (playingIndex !== null) {applySelectionHighlightPlaylist(true);}
}
//Use folder function END
//Drop handling START
//Overlay only shows that dropping is possible. Dropping itself is handled on the whole document, so it works even if the overlay didn't show yet.
//The overlay hides by itself 1.5 seconds after the last drag event (drag cancelled, left the window...)
let dropZoneTimeout;
function showDropZone()
{
  document.getElementById("drop_zone").style.display="block";
  clearTimeout(dropZoneTimeout);
  dropZoneTimeout=setTimeout(hideDropZone,1500);
}
function hideDropZone()
{
  clearTimeout(dropZoneTimeout);
  document.getElementById("drop_zone").style.display="none";
}
document.addEventListener('dragenter', function(ev){ev.preventDefault();showDropZone();});
document.addEventListener('dragover', function(ev){ev.preventDefault();showDropZone();});
document.addEventListener('dragleave', function(ev){if(!ev.relatedTarget){hideDropZone();}});
document.addEventListener('dragend', hideDropZone);
document.addEventListener('mousemove', function(){if(document.getElementById("drop_zone").style.display==="block"){hideDropZone();}});
document.addEventListener('drop', function(ev){dropHandler(ev);});
//Paths of dropped files. Some Linux file managers only send file:// links, not real files
function getDroppedPaths(dataTransfer)
{
  const paths=[];
  [...dataTransfer.files].forEach(function(file){if(file.path){paths.push(file.path);}});
  if(paths.length===0)
  {
    const uriList=dataTransfer.getData('text/uri-list') || dataTransfer.getData('text/plain') || '';
    uriList.split(/\r?\n/).forEach(function(line)
    {
      line=line.trim();
      if(line.startsWith('file://')){try{paths.push(decodeURIComponent(line.substring(7)));}catch(error){}}
    });
  }
  return paths;
}
function isSupportedMediaFile(filePath)
{
  const ext=filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return fileTypes.Audio.includes(ext) || fileTypes.Video.includes(ext);
}
function dropHandler(ev)
{
  console.log("File(s) dropped");
  ev.preventDefault();
  hideDropZone();
  const paths=getDroppedPaths(ev.dataTransfer).filter(isSupportedMediaFile);
  if(paths.length===0){customAlert('No supported audio or video files were dropped');return;}
  paths.forEach(function(filePath){processFile(filePath);});
  let trackType=track_list[track_index].type;
  if(trackType.includes('audio')){openMusic();}
  if(trackType.includes('video')){openVideo();}
  loadTrack(track_index);
  playTrack();
  applySelectionHighlightPlaylist();
}
console.log("Checkpoint 2");
function dragOverHandler(ev)
{
  console.log("File(s) in drop zone");
  ev.preventDefault();
}
//Drop handling END
