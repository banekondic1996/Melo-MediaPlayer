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
  async function processFile(filePath)
  {
    let found_file=0;
    track_list.forEach((element,index)=>{if (filePath==element.path) {found_file=1;track_index=index;return}});
    if (processPlatform != "win32") {filePath="file://"+filePath;} // If not on windows, adds needes string to file path
    /* if(processPlatform=='win32'){filePath.replace(/\\/g, '\\\\');} */
    let splitArg=pathArgSpliter(filePath); // Split given file path into strings
    let nameIndex=splitArg.length-1; // Index of file name in splited string array, last one is extension
    let nameArg=splitArg[nameIndex];  // The name of file including file extension
    let extArg=filePath.substring(filePath.lastIndexOf('.')) // The file extension
    let fileType // The file type
    nameArg=nameArg.substring(0,nameArg.lastIndexOf('.')) // The name of the file, removes extension if left
    let duration; // The audio/video duration variable
    let folderPath = filePath.substring(0, filePath.length-nameArg.length); // Path of folder that contains the file
    let durationMinutes
    let durationSeconds
      track_list.forEach(function(element,index) { if (filePath==element.path){found_file=1;track_index=index;playTrack(track_index)}} );
      if(found_file==0)
      { 
        track_index=track_list.length; // Not -1 cause file will be added and track_list length will increase by 1
        // If extension is audio
        if(fileTypes.Audio.includes(extArg)) 
        {
          fileType='audio';
          playlistMusic.innerHTML  = playlistMusic.innerHTML +
          `<tr trackIndex='`+track_index+`'' onclick="loadTrack('`+ track_index +`');playTrack();resetSelectionHighlightPlaylist();this.classList.add('selected')">
          <td>`+nameArg+`</td>
          <td class="track-duration" style='align-self: center;'></td>
          </tr>`;
        } 
        // If extension is video
        if(fileTypes.Video.includes(extArg)) 
        {
          fileType='video';
          playlistVideo.innerHTML  = playlistVideo.innerHTML +
          `<tr trackIndex='`+track_index+`'' onclick="loadTrack('`+ track_index +`');playTrack();applySelectionHighlightPlaylist(true);">
          <td>`+nameArg+`</td>
          <td class="track-duration" style='align-self: center;'></td>
          </tr>`;
          tabelaVideoBarLista.innerHTML=tabelaVideoBarLista.innerHTML +
          `<tr trackIndex='`+track_index+`'' oncontextmenu="track_list.splice('`+track_index+`',1);" onclick="loadTrack('`+ track_index +`');playTrack();applySelectionHighlightPlaylist(true);">
          <td>`+nameArg+`</td>
          <td class="track-duration" style='align-self: center;'></td>
          </tr>`;
        } 
        let theFile={"name": nameArg, "artist": "","image":"set/default.jpg","path":filePath,"duration":"","type":fileType};
        console.log("Push non repeated file");
        track_list.push(theFile);
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
  useFolderInput.click(); // Simulate click to start open folder dilog
}
//Use folder function START
function useFolder(files){
  for (let i=0;i<files.length;i++)
  {
    if(files[i].type.includes("audio") || files[i].type.includes("video") && !files[i].type.includes("tts") )
    {
      console.log(files[i])
      processFile(files[i].path);
    }
  }
  clearList();
  populateVideo(); //Populate video playlist table
  populateMusic(); //Populate video playlist table
}
//Use folder function END
//Drop handling START
document.addEventListener('dragover', function () {document.getElementById("drop_zone").style.display="block";});
function dropHandler(ev)
{
  console.log("File(s) dropped");
  ev.preventDefault();
  if (ev.dataTransfer.items)
  {
    [...ev.dataTransfer.items].forEach((item, i) =>
    {
      if (item.kind === "file")
      {
        const file = item.getAsFile();
        processFile(file.path); //New function to process files, seems slower
        console.log("ev length");
        console.log([...ev.dataTransfer.items].length);
        console.log("current index");
        console.log(i);
        if([...ev.dataTransfer.items].length-1==i)
        {
          /* setTimeout(()=>loadMetaData(),500); */
        }
      }
    }); 
  }
  else
  {
    [...ev.dataTransfer.files].forEach((file, i) =>
    {
      console.log(`… file[${i}].name = ${file.path}`);
    });
  }
  document.getElementById("drop_zone").style.display="none";
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
