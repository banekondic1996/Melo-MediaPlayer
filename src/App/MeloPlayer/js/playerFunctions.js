//Get random number for random shuffle
function getRandomInt(max) {return Math.floor(Math.random() * max);}

//Shuffle tracks at random function
function shufflePlay()
{
  var randTrack=getRandomInt(track_list.length);
  if(randTrack==track_index)
  {
    randTrack=randTrack+1;
    console.log("while"+ randTrack);
  }
  else if(randTrack!=track_index)
  {
    console.log("played"+ randTrack);
    loadTrack(randTrack);
    playTrack();
    applySelectionHighlightPlaylist();
  }
}
console.log("Checkpoint 8");
//Track loading function
function loadTrack(index)
{
  track_index=index;
  clearInterval(updateTimer);
  resetValues();
  if (track_list[track_index].type.includes("video"))
  {
    videoContainerElement.style.display="block";
    videoPlaylistSideButtonElement.style.display="block";
    track_art.style.display="none";
  }
  else
  {
    videoContainerElement.style.display="none";
    videoPlaylistSideButtonElement.style.display="none";
    track_art.style.display="block";
  }
  // Video uses the chosen playback speed, music always plays at normal speed (load() resets the rate to the default one)
  const isVideoTrack = track_list[track_index].type.includes("video");
  audioVideoElement.defaultPlaybackRate = isVideoTrack ? videoPlaybackRate : 1;
  // Subtitles belong to the previous video
  clearSubtitles();
  // Load a new track
  if (typeof releaseStream === 'function') {releaseStream();}
  const loadingTrack = track_list[track_index];
  if (loadingTrack.stream || loadingTrack.hls)
  {
    //HLS is played by hls.js, rtsp is converted to HLS by ffmpeg first (address is ready when the local server has the first segments)
    audioVideoElement.removeAttribute('src');
    audioVideoElement.load();
    getPlayableSource(loadingTrack).then(function(source)
    {
      if (track_list[track_index] !== loadingTrack) {return;} //Another track was chosen meanwhile
      playHls(source);
    }).catch(function(error)
    {
      audioVideoElement.dispatchEvent(new Event('streamfailed'));
      if (typeof networkAttemptActive === 'undefined' || !networkAttemptActive) {customAlert('Could not open the stream: ' + error.message);}
    });
  }
  else
  {
    audioVideoElement.src = loadingTrack.path;
    audioVideoElement.load();
  }
  updateVideoMenuItems();
  // Update details of the track
  track_art.src= track_list[track_index].image ;
  track_name.textContent = track_list[track_index].name;
  document.title = track_list[track_index].artist+' - '+track_list[track_index].name;
  track_artist.textContent =  track_list[track_index].artist;
  //now_playing.textContent = "PLAYING " + (track_index + 1) + " OF " + track_list.length;
  // Set an interval of 1000 milliseconds for updating the seek slider
  updateTimer = setInterval(seekUpdate, 1000);
  // Move to the next track if the current one finishes playing
}
//Track error event listner
audioVideoElement.addEventListener('error', function()
{
  console.log("Video error");
  if(isNaN(audioVideoElement.duration) && track_list[track_index].path.includes(".mp4") && audioVideoElement.src!=error_track_src)
  {
    fixEncoding(track_list[track_index].path);
    error_track_src=audioVideoElement.src;
    setTimeout(()=>fixMedia(track_list[track_index].path),1500)
  }
},false);
//Track loaded data event listener
audioVideoElement.addEventListener('loadeddata', function() {console.log("Video loaded"); VideoErr=0; seekTrimEnd();}, false);
audioVideoElement.addEventListener("ended", nextTrack);
console.log("Checkpoint 10");
// Reset track duration/current time values
function resetValues()
{
  curr_time.textContent = "00:00";
  total_duration.textContent = "00:00";
  time_trim_end.textContent="00:00";
  seek_slider.value = 0;
}
//Play/pause toggle function
function playpauseTrack() {
  if (!isPlaying) playTrack();
  else {pauseTrack()};
}
//Play track and change icon to pause
function playTrack()
{
  isPlaying = true;
  playpause.src = "set/pause.png";
  startPlayback(3);
}
//Starts playback and tries again if the browser wasn't ready yet. Without this the first video opened on app start could stay stopped
function startPlayback(retries)
{
  resumeAudioContext(); //A suspended audio context freezes the media element
  const playPromise = audioVideoElement.play();
  if (playPromise && playPromise.catch)
  {
    playPromise.catch(function(error)
    {
      console.log("Play failed: "+error.name);
      if (error.name==='AbortError' || !isPlaying) {return;} //A newer track was loaded or user paused, nothing to do
      if (retries>0) {setTimeout(function(){if(isPlaying){startPlayback(retries-1);}},250);}
      else {isPlaying=false;playpause.src="set/play.png";}
    });
  }
}

console.log("Checkpoint 12");
//Pause track and change icon to play
function pauseTrack()
{
  audioVideoElement.pause();
  isPlaying = false;
  playpause.src = "set/play.png";
}
//Go to next track function
function nextTrack()
{
  if (track_list.length>0 && track_index<track_list.length-1) {track_index=parseInt(track_index)+1;loadTrack(track_index);playTrack();}
  else {track_index = 0;loadTrack(track_index);playTrack();}
  applySelectionHighlightPlaylist();
}
//Go to previous track function
function prevTrack()
{
  if (track_list.length>0 && track_index!=0){track_index=parseInt(track_index)-1;loadTrack(track_index);playTrack();}
  else {track_index = track_list.length-1;loadTrack(track_index);playTrack();}
  applySelectionHighlightPlaylist();
}
//Add zeros to duration number (if it's 9 sec, it will show 09 sec)
function padZero(number) {return number < 10 ? '0' + number : number;}
//Seeking on slider input function
function seekTo()
{
  seekto = audioVideoElement.duration * (seek_slider.value / 500);
  audioVideoElement.currentTime = seekto;
}
//Right thumb of video trimming slider
function seekTrimEnd()
{
  seekEndDuration=audioVideoElement.duration*(seek_trim_end.value/500);
  console.log("seekEndDuration:"+seekEndDuration+"seek_trim_end:"+seek_trim_end.value);
  let seekEndMinutes = Math.floor(seekEndDuration/ 60);
  let seekEndSeconds = Math.floor(seekEndDuration - seekEndMinutes * 60);
  seekEndMinutes=padZero(parseInt(seekEndMinutes, 10));
  seekEndSeconds=padZero(parseInt(seekEndSeconds, 10));
  let seekEndText= seekEndMinutes+":"+seekEndSeconds;
  time_trim_end.innerHTML=seekEndText;
  console.log(seekEndText);
  console.log("Duration"+seekEndDuration);
}
//Left thumb of video trimming slider
function seekTrimStart()
{
  seekStartDuration=audioVideoElement.duration*(seek_trim_start.value/500);
  audioVideoElement.currentTime = seekStartDuration;
  console.log("seekEndDuration:"+seekStartDuration+"seek_trim_end:"+seek_trim_start.value);
  let seekStartMinutes = Math.floor(seekStartDuration/ 60);
  let seekStartSeconds = Math.floor(seekStartDuration - seekStartMinutes * 60);
  seekStartMinutes=padZero(parseInt(seekStartMinutes, 10));
  seekStartSeconds=padZero(parseInt(seekStartSeconds, 10));
  let seekStartText= seekStartMinutes+":"+seekStartSeconds;
  time_trim_start.innerHTML=seekStartText;
  console.log(seekStartText);
}
//Change trimming slider color
function seekTrimColor()
{
  let seek_trim_start_prc=seek_trim_start.value/5;
  let seek_trim_end_prc=seek_trim_end.value/5;
  seek_trim_start.style.background='linear-gradient(to right, rgb(8, 8, 8, 0.44) 0%, rgb(8, 8, 8, 0.44) '+seek_trim_start_prc+'%, '+style.getPropertyValue('--sliderColorFull')+' '+seek_trim_start_prc+'%, '+style.getPropertyValue('--sliderColorFull')+' '+seek_trim_end_prc+'%, rgb(8, 8, 8, 0.44) '+seek_trim_end_prc+'%, rgb(8, 8, 8, 0.44) 100%)';
}
//Set volume on volume slider input
function setVolume() {audioVideoElement.volume = volume_slider.value / 100;
    if(isMuted){setMuted(false);} //Moving the slider unmutes
    setSetting('volume',parseInt(volume_slider.value,10));
    console.log("voolume is:"+audioVideoElement.volume);
    console.log("voolume is slider / 100:"+volume_slider.value / 100)
};



//Change volume by given amount (keyboard arrows), keeps it between 0 and 1
function changeVolume(delta)
{
  const newVolume=Math.min(1,Math.max(0,audioVideoElement.volume+delta));
  audioVideoElement.volume=newVolume;
  volume_slider.value=newVolume*100;
  setSetting('volume',Math.round(newVolume*100));
}
//Playback speed for video (slider in the menu). Music is always played at normal speed
let videoPlaybackRate=1;
function setPlaybackSpeed(value)
{
  let rate=parseFloat(value);
  if(isNaN(rate)){rate=1;}
  rate=Math.min(3,Math.max(0.25,rate));
  videoPlaybackRate=rate;
  audioVideoElement.defaultPlaybackRate=rate;
  audioVideoElement.playbackRate=rate;
  document.getElementById('speedSliderId').value=rate;
  document.getElementById('speedValueId').textContent=rate.toFixed(2)+'x';
}
console.log("Checkpoint 13");
//Auto move seekslider while track is playing
function seekUpdate()
{
  let seekPosition = 0;
  // Check if the current track duration is a legible number
  if (audioVideoElement.duration === Infinity) {total_duration.textContent = 'LIVE';} //Live stream
  else if (!isNaN(audioVideoElement.duration))
  {
    seekPosition = audioVideoElement.currentTime * (500 / audioVideoElement.duration);
    seek_slider.value = seekPosition;
    // Calculate the time left and the total duration
    let currentMinutes = Math.floor(audioVideoElement.currentTime / 60);
    let currentSeconds = Math.floor(audioVideoElement.currentTime - currentMinutes * 60);
    let durationMinutes = Math.floor(audioVideoElement.duration / 60);
    let durationSeconds = Math.floor(audioVideoElement.duration - durationMinutes * 60);
    // Adding a zero to the single digit time values
    if (currentSeconds < 10) { currentSeconds = "0" + currentSeconds; }
    if (durationSeconds < 10) { durationSeconds = "0" + durationSeconds; }
    if (currentMinutes < 10) { currentMinutes = "0" + currentMinutes; }
    if (durationMinutes < 10) { durationMinutes = "0" + durationMinutes; }
    curr_time.textContent = currentMinutes + ":" + currentSeconds;
    total_duration.textContent = durationMinutes + ":" + durationSeconds;
  }
}
//Seek slider container events
const container = document.getElementById("seekSliderContainer");
let isDraggingSeek = false;
function updateSlider(event) 
{
const rect = container.getBoundingClientRect();
const offsetX = event.clientX - rect.left;
const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
seek_slider.value = percentage * (seek_slider.max - seek_slider.min);
seek_slider.dispatchEvent(new Event("input")); // Trigger input event
}
container.addEventListener("mousedown", (event) => { isDraggingSeek = true; updateSlider(event); });
document.addEventListener("mousemove", (event) => { if (isDraggingSeek) {updateSlider(event);} });
document.addEventListener("mouseup", () => { isDraggingSeek = false; });

//Unpause at time. Times are in the time zone chosen in Settings > Player (default: this PC's own time zone)
let unPauseWatchTimer = null;
let unPauseClockTimer = null;
function getUnpauseZone() {return (settings.timeZone && settings.timeZone !== 'system') ? settings.timeZone : undefined;}
//Date and time parts of a moment, as seen in a time zone
function zonedParts(timestamp, zone)
{
  const parts = {};
  new Intl.DateTimeFormat('en-CA', {timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})
  .formatToParts(new Date(timestamp)).forEach(function(part) {parts[part.type] = part.value;});
  return parts;
}
//"2026-10-23T14:05" for the time input, now + some minutes
function unpauseInputValue(addMinutes)
{
  const zone = getUnpauseZone();
  const timestamp = Date.now() + addMinutes * 60000;
  const p = zonedParts(timestamp, zone);
  return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute;
}
//Time typed in the input (wall clock of the chosen zone) to a real moment
function unpauseTargetTime(text)
{
  const m = text.match(/^(\d+)-(\d+)-(\d+)T(\d+):(\d+)/);
  if (!m) {return NaN;}
  const zone = getUnpauseZone();
  if (!zone) {return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();}
  const wanted = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let guess = wanted;
  for (let i = 0; i < 2; i++)
  {
    const p = zonedParts(guess, zone);
    guess -= Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - wanted;
  }
  return guess;
}
//Digital clock above the time setting
function updateUnpauseClock()
{
  if (unPauseAtTimeEl.style.display === 'none' || unPauseAtTimeEl.style.display === '')
  {
    clearInterval(unPauseClockTimer);
    unPauseClockTimer = null;
    return;
  }
  const zone = getUnpauseZone();
  const p = zonedParts(Date.now(), zone);
  document.getElementById('unPauseClockId').textContent = p.hour + ':' + p.minute + ':' + p.second;
  document.getElementById('unPauseZoneId').textContent = p.year + '-' + p.month + '-' + p.day + '  ' + (zone ? zone : 'This PC (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')');
  unPause_time.min = unpauseInputValue(0);
}
function unPauseTimeF()
{
  unPauseAtTimeEl.style.display = "flex";
  if (settings.autoTime || !unPause_time.value) {unPause_time.value = unpauseInputValue(1);} //Auto update: start from the current time
  updateUnpauseClock();
  if (unPauseClockTimer === null) {unPauseClockTimer = setInterval(updateUnpauseClock, 1000);}
}
//Unpause or play at given date and time
function watchTime(targetText)
{
  const target = unpauseTargetTime(targetText);
  const left = target - Date.now();
  if (isNaN(target) || left <= 0) {customAlert("Choose a time in the future"); return;}
  clearInterval(unPauseWatchTimer);
  const totalMinutes = Math.ceil(left / 60000);
  customAlert("Play/pause in: " + Math.floor(totalMinutes / 1440) + " Days " + Math.floor(totalMinutes % 1440 / 60) + " Hours " + (totalMinutes % 60) + " Minutes");
  //Checked every second against the PC clock, so it still fires on time after the PC was asleep
  unPauseWatchTimer = setInterval(function()
  {
    if (Date.now() >= target)
    {
      clearInterval(unPauseWatchTimer);
      unPauseWatchTimer = null;
      playpauseTrack();
    }
  }, 1000);
}
