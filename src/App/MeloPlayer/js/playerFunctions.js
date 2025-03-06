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
  // Load a new track
  audioVideoElement.src = track_list[track_index].path;
  audioVideoElement.load();
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
  audioVideoElement.play();
  isPlaying = true;
  playpause.src = "set/pause.png";
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
    console.log("voolume is:"+audioVideoElement.volume);
    console.log("voolume is slider / 100:"+volume_slider.value / 100)
};



console.log("Checkpoint 13");
//Auto move seekslider while track is playing
function seekUpdate()
{
  let seekPosition = 0;
  // Check if the current track duration is a legible number
  if (!isNaN(audioVideoElement.duration))
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

//Get current date/time for unpause at time menu
const dateNow = new Date();
let dateNowFormated= new Date().toISOString().slice(0, -8);
unPause_time.value=dateNowFormated;
unPause_time.min=dateNowFormated;
console.log(dateNowFormated);
console.log("Checkpoint 9");
//Display unpause at the time dialog
function unPauseTimeF(){unPauseAtTimeEl.style.display="flex";}
//Unpause or play at given date and time
function watchTime(targetTime)
{
    const currentTime = new Date();
    const fixedDate = new Date(targetTime + ':00.000Z');
    const totalDays=fixedDate.getDay()-currentTime.getDay();
    const totalHours=fixedDate.getHours()-currentTime.getHours();
    const totalMinutes=fixedDate.getMinutes()-currentTime.getMinutes();
    customAlert("Play/pause in: "+totalDays+" Days "+totalHours+" Hours "+totalMinutes+" Minutes");
    function updateStatus()
    {
    const currentTime = new Date();
    const isoString = currentTime.toISOString();
    const currentTimeString = isoString.slice(0,-8);
    if (currentTimeString === targetTime) 
    {
        console.log( `Current time (${currentTimeString}) is equal to target time (${targetTime})!`);
        playpauseTrack();
    } 
    else 
    {
        console.log( `Current time: ${currentTimeString}`);
    }
    }
    updateStatus();
    setInterval(updateStatus, 60000);
}
console.log(unPause_time.value)