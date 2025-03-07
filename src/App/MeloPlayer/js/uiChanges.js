//Dark Mode
function darkmode()
{
  if(!darkMode)
  {
    darkMode = document.createElement("link");
    darkMode.href = "css/darkMode.css"; //your url
    darkMode.rel = "stylesheet";
    document.head.appendChild(darkMode);
  }
 else{darkMode.remove();darkMode=''}
}
//Windows maximization handling
function WindowMinMax()
{
  if(isMax==1)
  {
    if(win.isKioskMode==true) {win.leaveKioskMode();isMax=0;win.setResizable(true);}
    else {win.unmaximize();isMax=0;}
  }
  else
  {
    if(videoContainerElement.style.display=="block"){win.enterKioskMode();isMax=1;win.setResizable(false);}
    else{win.maximize();isMax=1;}
  }
}
//Open music list view
function openMusic()
{
  playlistVideoTable.style.display='none';
  document.getElementById('videoCategoryBtnId').classList.remove('selected');
  document.getElementById('musicCategoryBtnId').classList.add('selected');
  console.log("openMusic")
  playerGEl.style.display="block";
  infoEl.style.display="flex";
  playlistContainerEl.style.display="flex";
  playlistMusicTable.style.display="flex";
  choiceMenuEl.style.display="flex";
  choiceMenuEl.styledisplay="block";
  videoContainerElement.style.display="none";
}
console.log("Checkpoint 11");
//Open video list view
function openVideo()
{
  playlistMusicTable.style.display='none';
  document.getElementById('musicCategoryBtnId').classList.remove('selected');
  document.getElementById('videoCategoryBtnId').classList.add('selected');
  console.log("openVideo");
  if (track_list[track_index].type.includes("video"))
  {
    videoContainerElement.style.display="block";
    videoPlaylistSideButtonElement.style.display="block";
  }
  playerGEl.style.display="block";
  infoEl.style.display="flex";
  playlistContainerEl.style.display="flex";
  playlistVideoTable.style.display="flex";
  choiceMenuEl.style.display="flex";
  choiceMenuEl.styledisplay="block";
  if(visualizerOn){visualizerSwitch()};
}
//Context menu START
if (document.addEventListener)
    {
      videoContainerElement.addEventListener('contextmenu', function(e)
      {
        contextMenuVideo.style.display="block";
        contextMenuVideo.style.left=e.clientX+"px";
        contextMenuVideo.style.top=e.clientY+"px";
        e.preventDefault();
      }, false);
    }
    else {videoContainerElement.attachEvent('oncontextmenu', function() {window.event.returnValue = false;});}
    document.addEventListener('click', function(e) {contextMenuVideo.style.display="none";}, false);
    //Context menu END
    //Invisible overlay that hides elements when hovered
    function overleymentFunction (pelement)
    {
      overleyment.style.display="none";
      videoPlaylistElement.style.display="none";
      const eleArray=[volumeb,menuListElement];
      overleyment.style.display="none";
      eleArray.forEach((element) => {if(element!=pelement){element.style.animation="fade-out 0.4s"}});
    }
    //Hide menu and volume slider on overlay hover
    function closeall()
    {
      overleyment.style.display="none";
      if(volumeb.style.display=='block')
      {
      volumeb.style.animation="fade-out 0.4s";
      }
      if(menuListElement.style.display=='block')
      {
      menuListElement.style.animation="fade-out 0.4s";
      }
    }
    //Auto hide elements function START
    const inactivityTimeout = 700; //Time until hiding
    let timeoutId;
    function hideElementsAndCursor()
    {
      if(isMax==1 && !overVideoElements)
      {
        document.getElementById('slider_container_Id').classList.add('hidden');
        document.getElementById('homeButtonsId').classList.add('hidden');
        audioVideoElement.style.cursor = 'none';
      }
      if(visualizerOn && !isOverList && !overChoiceMenu){
        infoEl.style.opacity="0.4";
        infoEl.style.mixBlendMode='plus-lighter';
        playlistContainerEl.style.opacity="0.2";
        choiceMenuEl.style.opacity="0.2";
        choiceMenuEl2.style.opacity="0.2";
        audioVideoElement.style.cursor = 'none';
      }
      else
      {
        audioVideoElement.style.cursor = 'none';
      }
    }
    function resetTimeout()
    {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(hideElementsAndCursor, inactivityTimeout);
    }
//Volume slider show
function volumeH()
{
  overleyment.style.display="block";
  volumeb.style.animation="fade-in 0.4s"
  volumeb.style.display='block';
}
//Volume slider show/hide
function volumeC(){
  switch(volumeb.style.display)
  {
  case 'none':
    overleyment.style.display="block";
    volumeb.style.animation="fade-in 0.4s"
    volumeb.style.display='block';
    break;
  case 'block':
    overleyment.style.display="none";
    volumeb.style.animation="fade-out 0.4s"
    break;
  }
}
//Show sidebar list in video view, activate overlay for autohide
function videoPlaylistSideButton()
{
  switch(videoPlaylistElement.style.display)
  {
  case 'none':
    overleyment.style.display="block";
    videoPlaylistElement.style.display='block';
    break;
  }
}
console.log("Checkpoint 7");
//Main menu
function openMenu()
{
  overleyment.style.display="block";
  switch(menuListElement.style.display)
  {
  case 'none':
    menuListElement.style.display='block';
    menuListElement.style.animation="fade-in 0.4s";
    break;
  case 'block':
    menuListElement.style.animation="fade-out 0.4s";
    break;
  }
}
//Shuffle button toggle function
function shuffle()
{
  switch(shuffleEl.style.display)
  {
    case 'none':
      shuffleEl.style.display='block';
      repeatEl.style.display='none';
      console.log("shuffle on");
      audioVideoElement.removeEventListener("ended", nextTrack);
      audioVideoElement.addEventListener("ended", shufflePlay);
      break;
    case 'block':
      shuffleEl.style.display='none';
      console.log("shuffle off");
      audioVideoElement.removeEventListener("ended", shufflePlay);
      audioVideoElement.addEventListener("ended", nextTrack);
      break;
  }
}
//Repeat button toggle
function repeat()
{
  switch(repeatEl.style.display)
  {
    case 'none':
      repeatEl.style.display='block';
      shuffleEl.style.display='none';
      console.log("repeat on");
      audioVideoElement.removeEventListener("ended", nextTrack);
      audioVideoElement.addEventListener("ended", playTrack);
      break;
    case 'block':
      repeatEl.style.display='none';
      console.log("repeat off");
      audioVideoElement.removeEventListener("ended", playTrack);
      audioVideoElement.addEventListener("ended", nextTrack);
      break;
  }
}
//Unhide left side elements hidden when visualizator on
function unHideElementsForVisual(){
    choiceMenuEl.classList.remove('hide');
    choiceMenuEl2.classList.remove('hide');
    track_art.classList.remove('hide');
    playlistContainerEl.classList.remove('hide');
    infoEl.style.width="auto";
    infoEl.style.justifyContent="center";
}
resetTimeout();
//Auto hide elements function END
//Pip video
async function pipVideo(){
  let videoElement = document.body.querySelector('video');
  try {
      if (!document.pictureInPictureElement) {
          win.minimize();
          await videoElement.requestPictureInPicture();
      } else {
          await document.exitPictureInPicture();
      }
  } catch (error) {
      console.error("Error enabling PiP:", error);
  }
}
//End